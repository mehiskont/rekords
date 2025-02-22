import { NextResponse } from "next/server"
import Stripe from "stripe"
import { calculatePriceWithoutFees } from "@/lib/price-calculator"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2023-10-16",
})

export async function POST(req: Request) {
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error("Missing STRIPE_SECRET_KEY environment variable")
    return NextResponse.json({ error: "Stripe is not properly configured" }, { status: 500 })
  }

  try {
    const { items, customer } = await req.json()

    // Calculate total amount
    const amount = items.reduce(
      (sum: number, item: any) => sum + Math.round(calculatePriceWithoutFees(item.price) * 100) * item.quantity,
      0,
    )

    // Prepare minimal metadata
    const minimalItems = items.map((item: any) => ({
      id: item.id,
      title: item.title,
      quantity: item.quantity,
      price: item.price,
    }))

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "usd",
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        items: JSON.stringify(minimalItems).slice(0, 500), // Limit to 500 characters
        customerEmail: customer.email,
      },
    })

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
    })
  } catch (error) {
    console.error("Error creating payment intent:", error)
    return NextResponse.json({ error: "Failed to create payment intent" }, { status: 500 })
  }
}

