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

    // Get user info for metadata
    const customerId = req.headers.get('x-user-id') || 'anonymous';
    
    // Create a checkout session first - this will be used on success page
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: lineItems,
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout`,
      metadata: {
        userId: customerId,
        customerEmail: customer.email,
        customerName: `${customer.firstName} ${customer.lastName}`,
        customerAddress: `${customer.address}, ${customer.city}, ${customer.state} ${customer.postalCode}, ${customer.country}`,
        items: JSON.stringify(
          items.map((item) => ({
            id: item.id,
            title: item.title,
            price: item.price,
            quantity: item.quantity,
            condition: item.condition || 'Used',
          })),
        ),
      },
    });
    
    console.log("Created checkout session:", session.id);
    
    // Create the payment intent connected to the session
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: "usd",
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        sessionId: session.id, // Link to checkout session
        userId: customerId,
        customerEmail: customer.email,
        customerName: `${customer.firstName} ${customer.lastName}`,
        customerAddress: `${customer.address}, ${customer.city}, ${customer.state} ${customer.postalCode}, ${customer.country}`,
        items: JSON.stringify(
          items.map((item) => ({
            id: item.id,
            title: item.title,
            price: item.price,
            quantity: item.quantity,
            condition: item.condition || 'Used',
          })),
        ),
      },
    })

    console.log("Payment intent created:", {
      id: paymentIntent.id,
      amount: paymentIntent.amount,
      items: items.length,
      sessionId: session.id
    })

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      sessionId: session.id // Also return the session ID
    })
  } catch (error) {
    console.error("Error creating payment intent:", error)
    return NextResponse.json(
      { error: "Failed to create payment intent", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}

