import { NextResponse } from "next/server"
import Stripe from "stripe"
import { calculatePriceWithoutFees } from "@/lib/price-calculator"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
})

export async function POST(req: Request) {
  try {
    const { items, customer } = await req.json()

    // Calculate total amount
    const amount = items.reduce(
      (sum: number, item: any) => sum + Math.round(calculatePriceWithoutFees(item.price) * 100) * item.quantity,
      0,
    )

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "usd",
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        items: JSON.stringify(items),
        customer: JSON.stringify(customer),
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

