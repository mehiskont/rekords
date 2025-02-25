import { NextResponse } from "next/server"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
})

export async function POST(req: Request) {
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error("Missing STRIPE_SECRET_KEY environment variable")
    return NextResponse.json({ error: "Stripe is not properly configured" }, { status: 500 })
  }

  try {
    const { orderId, amount, customer } = await req.json()

    if (!orderId || !amount || !customer) {
      return NextResponse.json(
        { error: "Missing required fields: orderId, amount, or customer information" },
        { status: 400 },
      )
    }

    // Create payment intent with the pre-calculated amount
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: "usd",
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        orderId,
        customerEmail: customer.email,
      },
    })

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
    })
  } catch (error) {
    console.error("Error creating payment intent:", error)
    return NextResponse.json(
      { error: "Failed to create payment intent", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}

