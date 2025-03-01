import { NextResponse } from "next/server"
import { headers } from "next/headers"
import Stripe from "stripe"
import { removeFromDiscogsInventory, updateDiscogsInventory } from "@/lib/discogs"
import { log } from "@/lib/logger"
import { prisma } from "@/lib/prisma"
import { createOrder, updateOrderStatus } from "@/lib/orders"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

export async function POST(req: Request) {
  log("Webhook received")
  const body = await req.text()
  const signature = headers().get("stripe-signature") as string

  if (!webhookSecret) {
    log("Missing STRIPE_WEBHOOK_SECRET environment variable", "error")
    return NextResponse.json({ message: "Missing webhook secret" }, { status: 500 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error"
    log(`❌ Webhook Error: ${errorMessage}`, "error")
    return NextResponse.json({ message: `Webhook Error: ${errorMessage}` }, { status: 400 })
  }

  log(`✅ Webhook event received: ${event.type}`)

  // Store webhook in database for debugging
  try {
    await prisma.webhookLog.create({
      data: {
        type: event.type,
        payload: JSON.stringify(event.data.object)
      }
    })
  } catch (error) {
    log(`Failed to store webhook log: ${error instanceof Error ? error.message : "Unknown error"}`, "error")
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        log(`Checkout session completed: ${session.id}`)
        
        // Check if an order already exists for this session to prevent duplicates
        const existingOrder = await prisma.order.findUnique({
          where: { stripeId: session.id }
        });
        
        if (existingOrder) {
          log(`Order already exists for session ${session.id}, skipping order creation`, "warn");
          // Update Discogs inventory for existing order if needed
          const orderItems = await prisma.orderItem.findMany({
            where: { orderId: existingOrder.id }
          });
          
          for (const item of orderItems) {
            try {
              log(`Processing Discogs inventory for existing order item ${item.discogsId}`)
              const updated = await updateDiscogsInventory(item.discogsId, item.quantity)
              log(updated ? `✅ Successfully updated Discogs inventory for item ${item.discogsId}` 
                : `❌ Failed to update Discogs inventory for item ${item.discogsId}`, updated ? "info" : "error")
            } catch (error) {
              log(`Error updating Discogs inventory for item ${item.discogsId}: ${error instanceof Error ? error.message : "Unknown error"}`, "error")
            }
          }
          
          break;
        }
        
        // Retrieve the session with line items
        const expandedSession = await stripe.checkout.sessions.retrieve(session.id, {
          expand: ["line_items", "customer"]
        })
        
        log(`Retrieved expanded session with ${expandedSession.line_items?.data.length || 0} line items`)
        
        if (!expandedSession.customer_details?.email) {
          log("No customer email found in session", "error")
          return NextResponse.json({ error: "No customer email found" }, { status: 400 })
        }
        
        // Get or create user
        let userId = session.metadata?.userId || null
        if (!userId) {
          const user = await prisma.user.findFirst({
            where: { email: expandedSession.customer_details.email }
          })
          
          if (user) {
            userId = user.id
            log(`Found existing user with ID: ${userId}`)
          } else if (session.metadata?.createAccount === "true") {
            // Create new user if requested
            const newUser = await prisma.user.create({
              data: {
                email: expandedSession.customer_details.email,
                name: expandedSession.customer_details.name || "",
              }
            })
            userId = newUser.id
            log(`Created new user with ID: ${userId}`)
          } else {
            log("No user found and no account creation requested")
            
            // Auto-create user for better order tracking
            try {
              const newUser = await prisma.user.create({
                data: {
                  email: expandedSession.customer_details.email,
                  name: expandedSession.customer_details.name || "",
                }
              })
              userId = newUser.id
              log(`Auto-created user with ID: ${userId}`)
            } catch (error) {
              log(`Failed to auto-create user: ${error instanceof Error ? error.message : "Unknown error"}`, "error")
              // Continue with anonymous user
            }
          }
        }
        
        // Parse items from metadata
        const items = session.metadata?.items ? JSON.parse(session.metadata.items) : []
        
        if (!items || items.length === 0) {
          log("No items found in session metadata", "error")
          return NextResponse.json({ error: "No items found in session" }, { status: 400 })
        }
        
        log(`Processing order with ${items.length} items for user ${userId || "anonymous"}`)
        
        // Create the order and update inventory in a transaction
        try {
          // Step 1: Create the order and mark as paid immediately
          const order = await createOrder(
            userId || "anonymous", // Use anonymous if no user ID
            items,
            expandedSession.shipping_details || expandedSession.customer_details,
            expandedSession.customer_details,
            session.id
          )
          
          log(`Order created successfully with ID: ${order.id}`)
          
          // Update order status
          await updateOrderStatus(order.id, "paid")
          log(`Order ${order.id} marked as paid`)
          
          // Step 2: Process Discogs inventory updates
          let allUpdatesSuccessful = true;
          for (const item of items) {
            try {
              log(`Processing Discogs inventory for item ${item.id}`)
              // Try multiple times to update inventory
              let updated = false;
              let attempts = 0;
              
              while (!updated && attempts < 3) {
                attempts++;
                updated = await updateDiscogsInventory(item.id.toString(), item.quantity || 1)
                if (updated) {
                  log(`✅ Successfully updated Discogs inventory for item ${item.id} (attempt ${attempts})`)
                  break;
                } else {
                  log(`Attempt ${attempts}: Failed to update Discogs inventory for item ${item.id}`, "warn")
                  // Wait a bit before retrying
                  await new Promise(resolve => setTimeout(resolve, 1000))
                }
              }
              
              if (!updated) {
                log(`❌ All attempts failed to update Discogs inventory for item ${item.id}`, "error")
                allUpdatesSuccessful = false;
              }
            } catch (error) {
              log(`Error updating Discogs inventory for item ${item.id}: ${error instanceof Error ? error.message : "Unknown error"}`, "error")
              allUpdatesSuccessful = false;
            }
          }
          
          log(`Order processing complete. All inventory updates successful: ${allUpdatesSuccessful}`)
        } catch (error) {
          log(`Failed to create or process order: ${error instanceof Error ? error.message : "Unknown error"}`, "error")
          return NextResponse.json({ error: "Order processing failed" }, { status: 500 })
        }
        
        break
      }
      
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        log(`Payment intent succeeded: ${paymentIntent.id}`)
        
        // Parse metadata items if they exist
        let items = [];
        if (paymentIntent.metadata?.items) {
          try {
            items = JSON.parse(paymentIntent.metadata.items);
            log(`Found ${items.length} items in payment intent metadata`);
          } catch (error) {
            log(`Error parsing items from payment intent metadata: ${error instanceof Error ? error.message : "Unknown error"}`, "error");
          }
        }
        
        if (paymentIntent.metadata?.sessionId) {
          log(`Associated with checkout session: ${paymentIntent.metadata.sessionId}`)
          
          // Find order by Stripe session ID
          const order = await prisma.order.findUnique({
            where: { stripeId: paymentIntent.metadata.sessionId },
            include: { items: true }
          })
          
          if (order) {
            log(`Found order ${order.id} for payment ${paymentIntent.id}`)
            
            // Only update status if it's not already paid
            if (order.status !== "paid") {
              await updateOrderStatus(order.id, "paid")
              log(`Updated order ${order.id} status to paid`)
            } else {
              log(`Order ${order.id} already marked as paid, skipping status update`)
            }
            
            // Process any Discogs inventory updates that might have failed
            if (order.items && order.items.length > 0) {
              log(`Processing ${order.items.length} order items for inventory updates`)
              
              for (const item of order.items) {
                log(`Checking inventory status for item ${item.discogsId}`)
                
                try {
                  // Check if the listing still exists (if not, we don't need to update it)
                  const updated = await updateDiscogsInventory(item.discogsId, item.quantity)
                  log(updated 
                    ? `✅ Successfully updated Discogs inventory for item ${item.discogsId}` 
                    : `❌ Failed to update Discogs inventory for item ${item.discogsId}`, 
                    updated ? "info" : "error")
                } catch (error) {
                  log(`Error updating Discogs inventory for item ${item.discogsId}: ${error instanceof Error ? error.message : "Unknown error"}`, "error")
                }
              }
            }
          } else if (items.length > 0) {
            // No order found, but we have items - this might be a case where checkout.session.completed wasn't processed
            log(`No order found for session ${paymentIntent.metadata.sessionId}, but payment succeeded. Creating order from payment intent.`, "warn")
            
            try {
              // Extract customer info from metadata
              const customerName = paymentIntent.metadata?.customerName || "";
              const customerEmail = paymentIntent.metadata?.customerEmail || "";
              const customerAddress = paymentIntent.metadata?.customerAddress || "";
              
              // Find or create user
              let userId = "anonymous";
              if (customerEmail) {
                const user = await prisma.user.findFirst({
                  where: { email: customerEmail }
                });
                
                if (user) {
                  userId = user.id;
                  log(`Found existing user with ID: ${userId}`);
                } else {
                  // Create new user
                  try {
                    const newUser = await prisma.user.create({
                      data: {
                        email: customerEmail,
                        name: customerName || "",
                      }
                    });
                    userId = newUser.id;
                    log(`Created new user with ID: ${userId}`);
                  } catch (error) {
                    log(`Failed to create user: ${error instanceof Error ? error.message : "Unknown error"}`, "error");
                  }
                }
              }
              
              // Create shipping/billing address from metadata
              const shippingAddress = {
                name: customerName,
                address: customerAddress,
                email: customerEmail
              };
              
              // Create order
              const order = await createOrder(
                userId,
                items,
                shippingAddress,
                shippingAddress,
                paymentIntent.metadata.sessionId
              );
              
              log(`Created order ${order.id} from payment intent metadata`);
              
              // Mark as paid immediately
              await updateOrderStatus(order.id, "paid");
              log(`Marked order ${order.id} as paid`);
              
              // Process Discogs inventory
              for (const item of items) {
                try {
                  log(`Processing Discogs inventory for item ${item.id}`);
                  const updated = await updateDiscogsInventory(item.id.toString(), item.quantity || 1);
                  log(updated 
                    ? `✅ Successfully updated Discogs inventory for item ${item.id}` 
                    : `❌ Failed to update Discogs inventory for item ${item.id}`, 
                    updated ? "info" : "error");
                } catch (error) {
                  log(`Error updating Discogs inventory for item ${item.id}: ${error instanceof Error ? error.message : "Unknown error"}`, "error");
                }
              }
            } catch (error) {
              log(`Failed to create order from payment intent: ${error instanceof Error ? error.message : "Unknown error"}`, "error");
            }
          } else {
            log(`No order found for session ${paymentIntent.metadata.sessionId} and no items in metadata`, "error")
          }
        } else if (items.length > 0) {
          // Handle payment intents without sessionId but with items
          log("Payment intent has no sessionId metadata but contains items, creating order", "warn")
          
          try {
            // Extract customer info from metadata
            const customerName = paymentIntent.metadata?.customerName || "";
            const customerEmail = paymentIntent.metadata?.customerEmail || "";
            const customerAddress = paymentIntent.metadata?.customerAddress || "";
            
            // Find or create user
            let userId = "anonymous";
            if (customerEmail) {
              const user = await prisma.user.findFirst({
                where: { email: customerEmail }
              });
              
              if (user) {
                userId = user.id;
              } else {
                // Create new user
                try {
                  const newUser = await prisma.user.create({
                    data: {
                      email: customerEmail,
                      name: customerName || "",
                    }
                  });
                  userId = newUser.id;
                } catch (error) {
                  log(`Failed to create user: ${error instanceof Error ? error.message : "Unknown error"}`, "error");
                }
              }
            }
            
            // Create shipping/billing address from metadata
            const address = {
              name: customerName,
              address: customerAddress,
              email: customerEmail
            };
            
            // Create order using payment intent ID as the Stripe ID
            const order = await createOrder(
              userId,
              items,
              address,
              address,
              paymentIntent.id
            );
            
            log(`Created order ${order.id} from payment intent`);
            
            // Mark as paid immediately
            await updateOrderStatus(order.id, "paid");
            
            // Process Discogs inventory
            for (const item of items) {
              try {
                const updated = await updateDiscogsInventory(item.id.toString(), item.quantity || 1);
                log(updated ? `✅ Updated Discogs inventory for item ${item.id}` : `❌ Failed to update Discogs inventory for item ${item.id}`);
              } catch (error) {
                log(`Error updating Discogs inventory: ${error instanceof Error ? error.message : "Unknown error"}`, "error");
              }
            }
          } catch (error) {
            log(`Failed to create order from payment intent: ${error instanceof Error ? error.message : "Unknown error"}`, "error");
          }
        } else {
          log("Payment intent has no sessionId or items metadata", "error")
        }
        
        break
      }
    }
  } catch (error) {
    log(`Unexpected error processing webhook: ${error instanceof Error ? error.message : "Unknown error"}`, "error")
    return NextResponse.json({ message: "Error processing webhook" }, { status: 500 })
  }

  return NextResponse.json({ message: "Webhook processed successfully" }, { status: 200 })
}

