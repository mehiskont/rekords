import { redirect } from "next/navigation"
import Link from "next/link"
import Stripe from "stripe"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { updateDiscogsInventory } from "@/lib/discogs"
import { log } from "@/lib/logger"
import { prisma } from "@/lib/prisma"
import { createOrder, updateOrderStatus } from "@/lib/orders"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
})

// Manual testing flag - set to true to test order creation without a real checkout
const MANUAL_TEST_MODE = true;

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: { session_id: string }
}) {
  // Check database connection first
  try {
    // Add explicit database connection test
    log("Testing database connection before processing order...");
    // Import from prisma.ts to avoid circular references
    const { prisma } = await import('@/lib/prisma');
    
    // Simple test query
    const result = await prisma.$queryRaw`SELECT 1 as connected`;
    log(`Database connection test result: ${JSON.stringify(result)}`);
  } catch (dbError) {
    log(`CRITICAL: Database connection failed: ${dbError instanceof Error ? dbError.message : String(dbError)}`, "error");
  }
  
  const sessionId = searchParams.session_id

  if (!sessionId && !MANUAL_TEST_MODE) {
    redirect("/")
  }
  
  log(`Success page loaded with session ID: ${sessionId || 'MANUAL_TEST_MODE'}`);

  let session;
  
  if (MANUAL_TEST_MODE && !sessionId) {
    // Create a mock session for testing
    log("MANUAL TEST MODE: Creating mock session");
    session = {
      id: "test_" + Date.now(),
      payment_status: "paid",
      status: "complete",
      metadata: {
        userId: "cm7niharu0000pvp2o2pd9ebv", // Your user ID from logs
        items: JSON.stringify([{
          id: "123456",
          title: "Test Record",
          price: 29.99,
          quantity: 1,
          condition: "Near Mint",
          cover_image: "/placeholder.svg"
        }])
      },
      customer_details: {
        email: "mehiskont@gmail.com", // Your email for testing
        name: "Test Customer"
      },
      shipping_details: {
        name: "Test Customer",
        address: {
          line1: "123 Test St",
          city: "Test City",
          state: "TS",
          postal_code: "12345",
          country: "US"
        }
      },
      amount_total: 2999,
      line_items: {
        data: [{
          amount_subtotal: 2999,
          quantity: 1,
          price: {
            product: {
              name: "Test Record",
              metadata: {
                discogsId: "123456"
              }
            }
          }
        }]
      }
    };
  } else {
    try {
      // Retrieve the real session from Stripe
      session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ["line_items", "payment_intent", "line_items.data.price.product"],
      });
    } catch (stripeError) {
      log(`Error retrieving Stripe session: ${stripeError instanceof Error ? stripeError.message : String(stripeError)}`, "error");
      // For test mode, create a mock session instead of failing
      if (MANUAL_TEST_MODE) {
        log("Falling back to mock session");
        session = {
          id: sessionId || "test_" + Date.now(),
          payment_status: "paid",
          status: "complete",
          metadata: {
            userId: "cm7niharu0000pvp2o2pd9ebv", 
            items: JSON.stringify([{
              id: "123456",
              title: "Test Record",
              price: 29.99,
              quantity: 1,
              condition: "Near Mint",
              cover_image: "/placeholder.svg"
            }])
          },
          customer_details: {
            email: "mehiskont@gmail.com",
            name: "Test Customer"
          },
          shipping_details: {
            name: "Test Customer",
            address: {
              line1: "123 Test St",
              city: "Test City",
              state: "TS",
              postal_code: "12345",
              country: "US"
            }
          },
          amount_total: 2999
        };
      } else {
        // In production, redirect on error
        redirect("/checkout?error=session_error");
      }
    }
  }

  if (!session) {
    log(`No session found for ID: ${sessionId}`)
    redirect("/")
  }

  // Process the order immediately on the success page
  // This is a fallback in case the webhook doesn't trigger
  try {
    // Force verbose logging
    log(`====== PROCESSING ORDER ON SUCCESS PAGE ======`);
    log(`Session ID: ${session.id}`);
    log(`Payment status: ${session.payment_status}`);
    log(`Session status: ${session.status}`);
    log(`User ID from metadata: ${session.metadata?.userId || "anonymous"}`);
    
    // Check if order exists - for manual test mode, use session ID
    let order = null;
    if (MANUAL_TEST_MODE) {
      // Skip order check in test mode
      log("Test mode - skipping existing order check");
    } else {
      order = await prisma.order.findUnique({
        where: { stripeId: session.id }
      });
    }

    log(`Order exists already? ${order ? "Yes, ID: " + order.id : "No"}`);

    if (!order) {
      log(`Creating new order for session ${session.id}`);
      
      // Get items from session metadata
      let items = [];
      try {
        items = session.metadata?.items ? JSON.parse(session.metadata.items) : [];
        log(`Found ${items.length} items in metadata`);
        if (items.length > 0) {
          log(`First item: ${JSON.stringify(items[0])}`);
        }
      } catch (parseError) {
        log(`Error parsing items from metadata: ${parseError instanceof Error ? parseError.message : String(parseError)}`, "error");
      }
      
      let orderItems = [];
      
      if (items.length === 0 && session.line_items?.data) {
        // If no items in metadata, reconstruct from line items
        try {
          const reconstructedItems = session.line_items.data.map(item => {
            const product = item.price?.product as Stripe.Product;
            return {
              id: product?.metadata?.discogsId || "unknown",
              title: product?.name || "Unknown Item",
              price: (item.amount_subtotal || 0) / 100,
              quantity: item.quantity || 1,
              condition: "Unknown"
            };
          });
          
          log(`Reconstructed ${reconstructedItems.length} items from line items`);
          if (reconstructedItems.length > 0) {
            log(`First reconstructed item: ${JSON.stringify(reconstructedItems[0])}`);
          }
          
          orderItems = reconstructedItems;
        } catch (reconstructError) {
          log(`Error reconstructing items: ${reconstructError instanceof Error ? reconstructError.message : String(reconstructError)}`, "error");
        }
      } else if (items.length > 0) {
        orderItems = items;
      } else {
        log(`No items found in session metadata or line items!`, "error");
      }
      
      if (orderItems.length > 0) {
        try {
          log(`Creating order with ${orderItems.length} items`);
          
          // Get user ID - important for logged in users
          let userId = session.metadata?.userId || "anonymous";
          if (userId === "anonymous" && session.customer_details?.email) {
            // Try to find user by email
            const user = await prisma.user.findFirst({
              where: { email: session.customer_details.email }
            });
            
            if (user) {
              userId = user.id;
              log(`Found user by email: ${userId}`);
            }
          }
          
          log(`Using user ID: ${userId}`);
          
          // Create order - this also sends the confirmation email
          order = await createOrder(
            userId,
            orderItems,
            session.shipping_details || session.customer_details,
            session.customer_details,
            session.id
          );
          
          log(`✅ Order created successfully: ${order.id}`);
          
          // Update order status
          await updateOrderStatus(order.id, "paid");
          log(`✅ Order status updated to paid`);
          
          // Update Discogs inventory
          for (const item of orderItems) {
            try {
              log(`Updating Discogs inventory for item ${item.id}, quantity ${item.quantity}`);
              const updated = await updateDiscogsInventory(item.id.toString(), item.quantity || 1);
              log(updated ? 
                `✅ Updated Discogs inventory for item ${item.id}` : 
                `❌ Failed to update Discogs inventory for item ${item.id}`
              );
            } catch (error) {
              log(`Error updating Discogs inventory: ${error instanceof Error ? error.message : String(error)}`, "error");
            }
          }
        } catch (createOrderError) {
          log(`ERROR CREATING ORDER: ${createOrderError instanceof Error ? createOrderError.message : String(createOrderError)}`, "error");
          // Check for specific errors
          if (createOrderError instanceof Error && createOrderError.message.includes("database")) {
            log(`DATABASE CONNECTION ERROR detected. Check your Supabase connection.`, "error");
          }
        }
      }
    } else {
      log(`Order already exists for session ${sessionId}: ${order.id}`);
    }
    
    log(`====== ORDER PROCESSING COMPLETED ======`);
  } catch (error) {
    log(`CRITICAL ERROR processing order on success page: ${error instanceof Error ? error.message : String(error)}`, "error");
  }

  const customerEmail = session.customer_details?.email
  const total = session.amount_total ? (session.amount_total / 100).toFixed(2) : "0.00"
  const orderNumber = session.id.slice(-8).toUpperCase()

  return (
    <div className="container max-w-2xl mx-auto px-4 py-8">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Thank you for your order!</CardTitle>
          <CardDescription>We&apos;ve sent a confirmation email to {customerEmail}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg bg-muted p-6">
            <h3 className="font-semibold mb-2">Order Details</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Order Number:</span>
                <span className="font-mono">{orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>Total:</span>
                <span>${total}</span>
              </div>
            </div>
          </div>

          <div className="space-y-2 text-center">
            <p className="text-muted-foreground">
              {session.metadata?.createAccount === "true"
                ? "Your account has been created. Check your email for login instructions."
                : "Create an account to track your orders and get faster checkout next time."}
            </p>
            <div className="flex gap-4 justify-center">
              <Button asChild>
                <Link href="/">Continue Shopping</Link>
              </Button>
              {session.metadata?.createAccount !== "true" && (
                <Button variant="outline" asChild>
                  <Link href="/auth/signin">Sign In</Link>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

