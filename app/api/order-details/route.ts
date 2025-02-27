import { NextResponse } from "next/server"
import Stripe from "stripe"
import { log } from "@/lib/logger"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
})

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const paymentIntentId = searchParams.get("paymentIntentId")

  if (!paymentIntentId) {
    return NextResponse.json({ error: "Payment Intent ID is required" }, { status: 400 })
  }

  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)
    log(`Payment Intent retrieved: ${paymentIntent.id}`)

    if (paymentIntent.status !== "succeeded") {
      log(`Payment Intent not succeeded: ${paymentIntent.status}`, "error")
      return NextResponse.json({ error: "Payment not succeeded" }, { status: 400 })
    }

    const customerEmail = paymentIntent.receipt_email
    const total = paymentIntent.amount ? (paymentIntent.amount / 100).toFixed(2) : "0.00"
    const orderNumber = paymentIntent.id.slice(-8).toUpperCase()

    const orderDetails = { customerEmail, total, orderNumber }
    log(`Order details: ${JSON.stringify(orderDetails)}`)

    return NextResponse.json(orderDetails)
  } catch (error) {
    log(`Error retrieving order details: ${error instanceof Error ? error.message : "Unknown error"}`, "error")
    return NextResponse.json({ error: "Failed to retrieve order details" }, { status: 500 })
  }
}

