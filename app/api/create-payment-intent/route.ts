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
    const { amount, customer, items } = await req.json()

    if (!amount || !customer || !items) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    console.log("Creating payment intent with items:", JSON.stringify(items))

    // Create products for each item
    const lineItems = await Promise.all(
      items.map(async (item: any) => {
        const product = await stripe.products.create({
          name: item.title,
          metadata: {
            discogs_id: item.id.toString(),
          },
        })

        const price = await stripe.prices.create({
          product: product.id,
          unit_amount: Math.round(item.price * 100),
          currency: "usd",
        })

        return {
          price: price.id,
          quantity: item.quantity,
        }
      }),
    )

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: "usd",
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        customerEmail: customer.email,
        customerName: `${customer.firstName} ${customer.lastName}`,
        customerAddress: `${customer.address}, ${customer.city}, ${customer.state} ${customer.postalCode}, ${customer.country}`,
        items: JSON.stringify(
          items.map((item) => ({
            id: item.id,
            title: item.title,
            price: item.price,
            quantity: item.quantity,
          })),
        ),
      },
    })

    console.log("Payment intent created:", {
      id: paymentIntent.id,
      amount: paymentIntent.amount,
      items: items.length,
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

