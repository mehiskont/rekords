import { headers } from "next/headers"
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import Stripe from "stripe"
import { authOptions } from "@/lib/auth"
import { calculatePriceWithoutFees } from "@/lib/price-calculator"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
})

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    const { items, customer } = await req.json()

    if (!session) {
      return NextResponse.json({ error: "You must be logged in to checkout" }, { status: 401 })
    }

    const lineItems = items.map((item: any) => ({
      price_data: {
        currency: "usd",
        product_data: {
          name: item.title,
          images: [item.cover_image],
          metadata: {
            discogs_id: item.id,
          },
        },
        unit_amount: Math.round(calculatePriceWithoutFees(item.price) * 100),
      },
      quantity: item.quantity,
    }))

    const origin = headers().get("origin")
    const stripeSession = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: lineItems,
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cart`,
      customer_email: session.user?.email!,
      metadata: {
        items: JSON.stringify(items),
      },
      shipping_address_collection: {
        allowed_countries: ["US", "CA", "GB"], // Add more countries as needed
      },
      shipping_options: [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            fixed_amount: {
              amount: 500, // $5.00
              currency: "usd",
            },
            display_name: "Standard Shipping",
            delivery_estimate: {
              minimum: {
                unit: "business_day",
                value: 5,
              },
              maximum: {
                unit: "business_day",
                value: 7,
              },
            },
          },
        },
        {
          shipping_rate_data: {
            type: "fixed_amount",
            fixed_amount: {
              amount: 1500, // $15.00
              currency: "usd",
            },
            display_name: "Express Shipping",
            delivery_estimate: {
              minimum: {
                unit: "business_day",
                value: 1,
              },
              maximum: {
                unit: "business_day",
                value: 2,
              },
            },
          },
        },
      ],
    })

    return NextResponse.json({ sessionId: stripeSession.id })
  } catch (err: any) {
    console.error(err)
    return NextResponse.json({ error: "Error creating checkout session" }, { status: 500 })
  }
}

