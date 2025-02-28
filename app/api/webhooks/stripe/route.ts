import { NextResponse } from "next/server"
import { headers } from "next/headers"
import Stripe from "stripe"
import { removeFromDiscogsInventory, updateDiscogsInventory } from "@/lib/discogs"
import { log } from "@/lib/logger"

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

      // Process each line item
      for (const item of session.line_items?.data || []) {
        log(`Processing line item: ${JSON.stringify(item)}`)
        const discogsId = item.price?.product?.metadata?.discogsId
        const quantity = item.quantity || 1
        
        if (discogsId) {
          log(`Updating Discogs inventory for item: ${discogsId}, quantity: ${quantity}`)
          const updated = await updateDiscogsInventory(discogsId, quantity)
          if (updated) {
            log(`✅ Updated inventory for Discogs item: ${discogsId}`)
          } else {
            log(`❌ Failed to update inventory for Discogs item: ${discogsId}`, "error")
          }
        }
      }
    } catch (error) {
      log(`❌ Error processing payment intent: ${error instanceof Error ? error.message : "Unknown error"}`, "error")
      return NextResponse.json({ message: "Error processing payment" }, { status: 500 })
    }
  }

  return NextResponse.json({ message: "Webhook processed successfully" }, { status: 200 })
}

