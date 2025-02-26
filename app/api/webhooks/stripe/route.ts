import { headers } from "next/headers"
import { NextResponse } from "next/server"
import Stripe from "stripe"
import { prisma } from "@/lib/prisma"
import { removeFromDiscogsInventory } from "@/lib/discogs-seller"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
})

export async function POST(req: Request) {
  const body = await req.text()
  const signature = headers().get("stripe-signature")!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    return NextResponse.json(
      { error: `Webhook Error: ${err instanceof Error ? err.message : "Unknown error"}` },
      { status: 400 },
    )
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        const metadata = paymentIntent.metadata

        const items = JSON.parse(metadata.items || "[]")
        const customer = JSON.parse(metadata.customer || "{}")

        // Create the order
        const order = await prisma.order.create({
          data: {
            total: paymentIntent.amount / 100,
            status: "paid",
            stripeId: paymentIntent.id,
            userId: customer.userId || null,
            shippingAddress: customer,
            items: {
              create: items.map((item: any) => ({
                discogsId: item.id.toString(),
                title: item.title,
                price: item.price,
                quantity: item.quantity,
                condition: item.condition,
              })),
            },
          },
        })

        // Remove sold items from Discogs inventory
        for (const item of items) {
          await removeFromDiscogsInventory(item.id.toString())
        }

        break
      }

      case "charge.failed":
        const failedCharge = event.data.object as Stripe.Charge
        await prisma.order.updateMany({
          where: { stripeId: failedCharge.payment_intent as string },
          data: { status: "failed" },
        })
        break

      case "charge.refunded":
        const refundedCharge = event.data.object as Stripe.Charge
        await prisma.order.updateMany({
          where: { stripeId: refundedCharge.payment_intent as string },
          data: { status: "refunded" },
        })
        break

      case "checkout.session.expired":
        const expiredSession = event.data.object as Stripe.Checkout.Session
        if (expiredSession.payment_intent) {
          await prisma.order.updateMany({
            where: { stripeId: expiredSession.payment_intent as string },
            data: { status: "expired" },
          })
        }
        break
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Error processing webhook:", error)
    return NextResponse.json({ error: "Failed to process webhook" }, { status: 500 })
  }
}

