import { prisma } from "@/lib/prisma"
import { updateDiscogsInventory } from "@/lib/discogs"
import { sendOrderConfirmationEmail } from "@/lib/email"
import type { CartItem } from "@/types/cart"
import type { OrderDetails, ShippingAddress } from "@/types/order"
import { log } from "@/lib/logger"
import { saveUserCheckoutInfo } from "@/lib/user"

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
  
  // Save shipping address to user profile if this is a real user (not anonymous)
  if (userId && userId !== "anonymous" && shippingAddress) {
    try {
      log(`Saving shipping address to user profile for ${userId}`)
      const nameParts = shippingAddress.name?.split(' ') || []
      
      await saveUserCheckoutInfo(userId, {
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || '',
        email: shippingAddress.email || billingAddress?.email || '',
        address: shippingAddress.address?.line1 || shippingAddress.line1 || '',
        city: shippingAddress.address?.city || shippingAddress.city || '',
        state: shippingAddress.address?.state || shippingAddress.state || '',
        country: shippingAddress.address?.country || shippingAddress.country || '',
        postalCode: shippingAddress.address?.postal_code || shippingAddress.postal_code || '',
      })
      log(`Successfully saved shipping address to user profile`)
    } catch (profileError) {
      log(`Error saving shipping address to user profile: ${profileError instanceof Error ? profileError.message : "Unknown error"}`, "error")
      // Continue with order creation even if profile update fails
    }
  }
  
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
          cover_image: "/placeholder.svg", // Ensure we have image for email
          format: item.format || "",
          artist: item.artist || "",
          label: item.label || ""
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
      
      // We've improved the main email sending function, so no need for this additional fallback
      // The primary sendOrderConfirmationEmail already has proper error handling and fallbacks
      
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

