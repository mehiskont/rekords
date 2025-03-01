import { NextResponse } from "next/server"
import { headers } from "next/headers"
import Stripe from "stripe"
import { removeFromDiscogsInventory, updateDiscogsInventory } from "@/lib/discogs"
import { log } from "@/lib/logger"
import { prisma } from "@/lib/prisma"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(req: Request) {
  log("Webhook received")
  const body = await req.text()
  const signature = headers().get("stripe-signature") as string

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
  await prisma.webhookLog.create({
    data: {
      type: event.type,
      payload: JSON.stringify(event.data.object)
    }
  })

  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object as Stripe.PaymentIntent
    log(`💰 PaymentIntent status: ${paymentIntent.status}`)
    log(`PaymentIntent ID: ${paymentIntent.id}`)
    log(`PaymentIntent metadata: ${JSON.stringify(paymentIntent.metadata)}`)

    try {
      // Retrieve the session to get line items
      const session = await stripe.checkout.sessions.retrieve(paymentIntent.metadata.sessionId as string, {
        expand: ["line_items"],
      })

      log(`Session ID: ${session.id}`)
      log(`Number of line items: ${session.line_items?.data.length || 0}`)

      // Add this immediately after getting the session to check the data structure
      log(`Complete session data: ${JSON.stringify(session, null, 2)}`)

      // Process each line item
      for (const item of session.line_items?.data || []) {
        try {
          log(`Processing line item: ${JSON.stringify(item, null, 2)}`)
          
          // Check for metadata at different places where Stripe might put it
          let discogsId = item.price?.product?.metadata?.discogsId
          
          if (!discogsId) {
            // Try alternate locations for the discogsId
            if (item.metadata && item.metadata.discogsId) {
              discogsId = item.metadata.discogsId
            } else if (item.price?.metadata?.discogsId) {
              discogsId = item.price.metadata.discogsId
            }
          }
          
          // If still no discogsId, log and skip
          if (!discogsId) {
            log(`❌ No discogsId found for line item: ${item.id}`, "error")
            continue
          }
          
          const quantity = item.quantity || 1
          log(`Updating Discogs inventory for item: ${discogsId}, quantity: ${quantity}`)
          
          const updated = await updateDiscogsInventory(discogsId, quantity)
          if (updated) {
            log(`✅ Successfully updated inventory for Discogs item: ${discogsId}`)
          } else {
            log(`❌ Failed to update inventory for Discogs item: ${discogsId}`, "error")
          }
        } catch (error) {
          log(`❌ Error processing line item: ${error instanceof Error ? error.message : String(error)}`, "error")
        }
      }
    } catch (error) {
      log(`❌ Error processing payment intent: ${error instanceof Error ? error.message : "Unknown error"}`, "error")
      return NextResponse.json({ message: "Error processing payment" }, { status: 500 })
    }
  }

  return NextResponse.json({ message: "Webhook processed successfully" }, { status: 200 })
}

