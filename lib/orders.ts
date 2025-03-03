import { prisma } from "@/lib/prisma"
import { updateDiscogsInventory } from "@/lib/discogs"
import { sendOrderConfirmationEmail, sendOrderShippedEmail } from "@/lib/email"
import type { CartItem } from "@/types/cart"
import type { OrderDetails, ShippingAddress } from "@/types/order"
import { log } from "@/lib/logger"

export async function createOrder(
  userId: string,
  items: CartItem[],
  shippingAddress: any,
  billingAddress: any,
  stripeSessionId: string,
) {
  log(`Creating order for user ${userId}, stripe session: ${stripeSessionId}`)
  
  // Calculate total from items
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  log(`Order total calculated: ${total}`)
  
  try {
    // Check if order already exists to prevent duplicates
    const existingOrder = await prisma.order.findUnique({
      where: { stripeId: stripeSessionId }
    });
    
    if (existingOrder) {
      log(`Order already exists for session ${stripeSessionId}, returning existing order`)
      return existingOrder;
    }
    
    // Create new order
    const order = await prisma.order.create({
      data: {
        userId,
        total,
        stripeId: stripeSessionId,
        status: "pending",
        shippingAddress,
        billingAddress,
        items: {
          create: items.map((item) => ({
            discogsId: item.id.toString(),
            title: item.title,
            price: item.price,
            quantity: item.quantity,
            condition: item.condition,
          })),
        },
      },
      include: {
        items: true,
        user: true,
      },
    })
    
    log(`Order created successfully with ID: ${order.id}`)
    
    // Discogs inventory updates are now handled by the webhook handler
    // to ensure they only happen when payment is confirmed
    
    // Send order confirmation email
    try {
      // Prepare order details for email
      const orderDetails: OrderDetails = {
        orderId: order.id,
        items: order.items.map((item) => ({
          title: item.title,
          quantity: item.quantity,
          price: item.price,
          condition: item.condition || undefined,
        })),
        total: order.total,
        shippingAddress: shippingAddress as ShippingAddress,
      }

      // Try to send to user's email first if they have an account
      if (order.user?.email) {
        try {
          log(`Attempting to send confirmation email to user account: ${order.user.email}`);
          const result = await sendOrderConfirmationEmail(order.user.email, orderDetails)
          if (result && result.success) {
            log(`Sent order confirmation email to user account: ${order.user.email}`)
          } else {
            log(`Failed to send email to user account: ${JSON.stringify(result)}`, "warn")
          }
        } catch (emailError) {
          log(`Exception sending email to user account: ${emailError instanceof Error ? emailError.message : String(emailError)}`, "error")
        }
      }
      
      // Also send to the email provided during checkout (may be different from account email)
      // This ensures guest users or users with different emails get confirmation
      const checkoutEmail = shippingAddress?.email || billingAddress?.email;
      if (checkoutEmail && (!order.user?.email || checkoutEmail !== order.user.email)) {
        try {
          log(`Attempting to send confirmation email to checkout email: ${checkoutEmail}`);
          const result = await sendOrderConfirmationEmail(checkoutEmail, orderDetails)
          if (result && result.success) {
            log(`Sent order confirmation email to checkout email: ${checkoutEmail}`)
          } else {
            log(`Failed to send email to checkout email: ${JSON.stringify(result)}`, "warn")
          }
        } catch (emailError) {
          log(`Exception sending email to checkout email: ${emailError instanceof Error ? emailError.message : String(emailError)}`, "error")
        }
      }
      
      // Additional failsafe - try the direct Resend API as last resort
      if ((order.user?.email || checkoutEmail) && orderDetails) {
        try {
          const emailTo = order.user?.email || checkoutEmail || '';
          log(`Attempting direct Resend API fallback to: ${emailTo}`);
          
          // Use direct Resend import
          const { Resend } = await import('resend');
          const resend = new Resend(process.env.RESEND_API_KEY || "re_U2Su4RXX_E72x5WeyUvBmJq3qu6SkV53d");
          
          const { data, error } = await resend.emails.send({
            from: 'Plastik Records <onboarding@resend.dev>',
            to: [emailTo],
            subject: `Your Order Confirmation - #${orderDetails.orderId}`,
            text: `Thank you for your order #${orderDetails.orderId}. Total: $${orderDetails.total.toFixed(2)}`,
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h1>Thank you for your order!</h1>
                <p>Order #${orderDetails.orderId}</p>
                <p>Your order has been confirmed. Total: $${orderDetails.total.toFixed(2)}</p>
                <p>You'll receive a detailed email receipt shortly.</p>
              </div>
            `
          });
          
          if (error) {
            log(`Direct Resend API error: ${JSON.stringify(error)}`, "error");
          } else {
            log(`Direct Resend API success: ${data?.id}`);
          }
        } catch (directError) {
          log(`Exception in direct Resend API: ${directError instanceof Error ? directError.message : String(directError)}`, "error");
        }
      }
      
      if (!order.user?.email && !checkoutEmail) {
        log("No email found to send order confirmation", "warn")
      }
    } catch (error) {
      log(`Failed to send order confirmation email: ${error instanceof Error ? error.message : String(error)}`, "error")
    }
    
    return order
  } catch (error) {
    log(`Error creating order: ${error instanceof Error ? error.message : String(error)}`, "error")
    throw error;
  }
}

export async function updateOrderStatus(orderId: string, status: string) {
  const order = await prisma.order.update({
    where: { id: orderId },
    data: { status },
    include: {
      items: true,
      user: true,
    },
  })

  // Send order shipped email when status changes to "shipped"
  if (status === "shipped") {
    const orderDetails: OrderDetails = {
      orderId: order.id,
      items: order.items.map((item) => ({
        title: item.title,
        quantity: item.quantity,
        price: item.price,
        condition: item.condition || undefined,
      })),
      total: order.total,
      shippingAddress: order.shippingAddress as ShippingAddress,
    }

    try {
      // Try sending to account email if available
      if (order.user?.email) {
        try {
          log(`Attempting to send shipping confirmation to user account: ${order.user.email}`);
          const result = await sendOrderShippedEmail(order.user.email, orderDetails)
          if (result && result.success) {
            log(`Sent shipping confirmation to account email: ${order.user.email}`)
          } else {
            log(`Failed to send shipping confirmation to account: ${JSON.stringify(result)}`, "warn")
          }
        } catch (emailError) {
          log(`Exception sending shipping email to account: ${emailError instanceof Error ? emailError.message : String(emailError)}`, "error")
        }
      }
      
      // Also try sending to shipping address email if different
      const shippingEmail = order.shippingAddress?.email;
      if (shippingEmail && (!order.user?.email || shippingEmail !== order.user.email)) {
        try {
          log(`Attempting to send shipping confirmation to shipping email: ${shippingEmail}`);
          const result = await sendOrderShippedEmail(shippingEmail, orderDetails);
          if (result && result.success) {
            log(`Sent shipping confirmation to shipping email: ${shippingEmail}`)
          } else {
            log(`Failed to send shipping confirmation to shipping email: ${JSON.stringify(result)}`, "warn")
          }
        } catch (emailError) {
          log(`Exception sending shipping email to shipping address: ${emailError instanceof Error ? emailError.message : String(emailError)}`, "error")
        }
      }
      
      // Additional failsafe - try the direct Resend API as last resort
      if ((order.user?.email || shippingEmail) && orderDetails) {
        try {
          const emailTo = order.user?.email || shippingEmail || '';
          log(`Attempting direct Resend API fallback for shipping email to: ${emailTo}`);
          
          // Use direct Resend import
          const { Resend } = await import('resend');
          const resend = new Resend(process.env.RESEND_API_KEY || "re_U2Su4RXX_E72x5WeyUvBmJq3qu6SkV53d");
          
          const { data, error } = await resend.emails.send({
            from: 'Plastik Records <onboarding@resend.dev>',
            to: [emailTo],
            subject: `Your Order Has Been Shipped - #${orderDetails.orderId}`,
            text: `Great news! Your order #${orderDetails.orderId} has been shipped and is on its way to you.`,
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h1>Your order has been shipped!</h1>
                <p>Order #${orderDetails.orderId}</p>
                <p>Great news! Your order has been shipped and is on its way to you.</p>
              </div>
            `
          });
          
          if (error) {
            log(`Direct Resend API error for shipping: ${JSON.stringify(error)}`, "error");
          } else {
            log(`Direct Resend API success for shipping: ${data?.id}`);
          }
        } catch (directError) {
          log(`Exception in direct Resend API for shipping: ${directError instanceof Error ? directError.message : String(directError)}`, "error");
        }
      }
      
      if (!order.user?.email && !shippingEmail) {
        log("No email found to send shipping confirmation", "warn")
      }
    } catch (error) {
      log(`Error in shipping email process: ${error instanceof Error ? error.message : String(error)}`, "error")
    }
  }

  return order
}

export async function getOrdersByUserId(userId: string) {
  try {
    return await prisma.order.findMany({
      where: { userId },
      include: {
        items: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  } catch (error) {
    console.error("Database error in getOrdersByUserId:", error);
    throw error; // Let the caller handle the error
  }
}

export async function getOrderById(orderId: string) {
  return prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: true,
    },
  })
}

