import { headers } from "next/headers"
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { hash } from "bcryptjs"
import Stripe from "stripe"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { calculatePriceWithoutFees } from "@/lib/price-calculator"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
})

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    const { items, customer } = await req.json()

    // Create account if requested
    let userId = session?.user?.id
    if (!session && customer.createAccount) {
      const hashedPassword = await hash(customer.password, 10)
      const user = await prisma.user.create({
        data: {
          email: customer.email,
          name: customer.name,
          address: customer.address,
          city: customer.city,
          country: customer.country,
          postalCode: customer.postalCode,
        },
      })
      userId = user.id
    }

    const lineItems = items.map((item: any) => ({
      price_data: {
        currency: "usd",
        product_data: {
          name: item.title,
          images: [item.cover_image],
          metadata: {
            discogsId: item.id,
          },
        },
        unit_amount: Math.round(item.price * 100), // Use actual price
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
      customer_email: session?.user?.email || customer.email,
      payment_intent_data: {
        metadata: {
          sessionId: "{CHECKOUT_SESSION_ID}",  // This will be replaced by Stripe
        },
      },
      metadata: {
        items: JSON.stringify(items),
        userId: userId || "",
        createAccount: customer.createAccount ? "true" : "false",
        customerData: JSON.stringify({
          name: customer.name,
          email: customer.email,
          address: customer.address,
          city: customer.city,
          country: customer.country,
          postalCode: customer.postalCode,
        }),
      },
      shipping_address_collection: {
        allowed_countries: ["US", "CA", "GB"],
      },
      shipping_options: [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            fixed_amount: {
              amount: 500,
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
              amount: 1500,
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

