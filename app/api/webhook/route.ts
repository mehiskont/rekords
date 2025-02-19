import { headers } from "next/headers"
import { NextResponse } from "next/server"
import Stripe from "stripe"
import { createOrder, updateOrderStatus } from "@/lib/orders"
import { prisma } from "@/lib/prisma"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
})

export async function POST(req: Request) {
  const body = await req.text()
  const signature = headers().get("stripe-signature") as string

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session

      // Retrieve the session with line items
      const expandedSession = await stripe.checkout.sessions.retrieve(session.id, {
        expand: ["line_items", "customer"],
      })

      if (!expandedSession.customer) {
        return NextResponse.json({ error: "No customer found" }, { status: 400 })
      }

      // Get the customer from our database
      const user = await prisma.user.findFirst({
        where: { email: expandedSession.customer_details?.email },
      })

      if (!user) {
        return NextResponse.json({ error: "No user found" }, { status: 400 })
      }

      // Create the order
      await createOrder(
        user.id,
        expandedSession.metadata.items ? JSON.parse(expandedSession.metadata.items) : [],
        expandedSession.shipping,
        expandedSession.customer_details,
        session.id,
      )

      break
    }

    case "payment_intent.succeeded": {
      const paymentIntent = event.data.object as Stripe.PaymentIntent

      // Find the order by Stripe session ID
      const order = await prisma.order.findUnique({
        where: { stripeId: paymentIntent.id },
      })

      if (order) {
        await updateOrderStatus(order.id, "paid")
      }

      break
    }
  }

  return NextResponse.json({ received: true })
}

