import { headers } from "next/headers"
import { NextResponse } from "next/server"
import Stripe from "stripe"
import { prisma } from "@/lib/prisma"

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

  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object as Stripe.PaymentIntent
    const metadata = paymentIntent.metadata

    try {
      const items = JSON.parse(metadata.items)
      const customer = JSON.parse(metadata.customer)

      // Create order in database
      await prisma.order.create({
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
    } catch (error) {
      console.error("Error processing webhook:", error)
      return NextResponse.json({ error: "Failed to process webhook" }, { status: 500 })
    }
  }

  return NextResponse.json({ received: true })
}

