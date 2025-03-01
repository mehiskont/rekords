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
          }
        }
        
        // Parse items from metadata
        const items = session.metadata?.items ? JSON.parse(session.metadata.items) : []
        
        // Create the order
        try {
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
          
          // Process Discogs inventory updates
          for (const item of items) {
            try {
              log(`Processing Discogs inventory for item ${item.id}`)
              const updated = await updateDiscogsInventory(item.id.toString(), item.quantity || 1)
              if (updated) {
                log(`✅ Successfully updated Discogs inventory for item ${item.id}`)
              } else {
                log(`❌ Failed to update Discogs inventory for item ${item.id}`, "error")
              }
            } catch (error) {
              log(`Error updating Discogs inventory for item ${item.id}: ${error instanceof Error ? error.message : "Unknown error"}`, "error")
            }
          }
        } catch (error) {
          log(`Failed to create order: ${error instanceof Error ? error.message : "Unknown error"}`, "error")
        }
        
        break
      }
      
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        log(`Payment intent succeeded: ${paymentIntent.id}`)
        
        if (paymentIntent.metadata?.sessionId) {
          log(`Associated with checkout session: ${paymentIntent.metadata.sessionId}`)
          
          // Find order by Stripe session ID
          const order = await prisma.order.findUnique({
            where: { stripeId: paymentIntent.metadata.sessionId }
          })
          
          if (order) {
            log(`Found order ${order.id} for payment ${paymentIntent.id}`)
            await updateOrderStatus(order.id, "paid")
            log(`Updated order ${order.id} status to paid`)
          } else {
            log(`No order found for session ${paymentIntent.metadata.sessionId}`, "error")
          }
        } else {
          log("Payment intent has no sessionId metadata", "error")
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

