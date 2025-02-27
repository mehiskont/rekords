import { NextResponse } from "next/server"
import { headers } from "next/headers"
import Stripe from "stripe"
import { removeFromDiscogsInventory } from "@/lib/discogs"
import { log } from "@/lib/logger"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(req: Request) {
  const body = await req.text()
  const signature = headers().get("stripe-signature") as string

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error"
    log(`❌ Error message: ${errorMessage}`, "error")
    return NextResponse.json({ message: `Webhook Error: ${errorMessage}` }, { status: 400 })
  }

  log(`✅ Success: ${event.id}`)
  log(`Event Type: ${event.type}`)

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
        if (discogsId) {
          log(`Attempting to remove Discogs item: ${discogsId}`)
          const removed = await removeFromDiscogsInventory(discogsId)
          if (removed) {
            log(`✅ Removed item from Discogs: ${discogsId}`)
          } else {
            log(`❌ Failed to remove item from Discogs: ${discogsId}`, "error")
          }
        } else {
          log(`❌ No Discogs ID found for item: ${item.id}`)
        }
      }
    } catch (error) {
      log(`❌ Error processing payment intent: ${error instanceof Error ? error.message : "Unknown error"}`, "error")
      return NextResponse.json({ message: "Error processing payment" }, { status: 500 })
    }
  }

  return NextResponse.json({ message: "Received" }, { status: 200 })
}

