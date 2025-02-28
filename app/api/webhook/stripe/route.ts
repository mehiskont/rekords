import { headers } from "next/headers"
import { NextResponse } from "next/server"
import Stripe from "stripe"
import { prisma } from "@/lib/prisma"
import { sendOrderConfirmationEmail, sendOrderFailedEmail } from "@/lib/email"

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

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        // Handle successful checkout completion
        if (session.payment_status === "paid") {
          await handleSuccessfulPayment(session)
        }
        break
      }

      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        await handleSuccessfulPayment(paymentIntent)
        break
      }

      case "payment_intent.failed":
      case "payment_intent.canceled": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        await handleFailedPayment(paymentIntent)
        break
      }

      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session
        await handleExpiredSession(session)
        break
      }

      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as Stripe.Checkout.Session
        await handleSuccessfulPayment(session)
        break
      }

      case "checkout.session.async_payment_failed": {
        const session = event.data.object as Stripe.Checkout.Session
        await handleFailedPayment(session)
        break
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge
        await handleRefund(charge)
        break
      }

      case "charge.refund.updated": {
        const refund = event.data.object as Stripe.Refund
        await handleRefundUpdate(refund)
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Error processing webhook:", error)
    return NextResponse.json({ error: "Failed to process webhook" }, { status: 500 })
  }
}

async function handleSuccessfulPayment(session: Stripe.Checkout.Session | Stripe.PaymentIntent) {
  const metadata = "metadata" in session ? session.metadata : {}
  const items = JSON.parse(metadata?.items || "[]")
  const customer = JSON.parse(metadata?.customer || "{}")

  const order = await prisma.order.create({
    data: {
      total: Number(session.amount) / 100,
      status: "paid",
      stripeId: session.id,
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

  // Send confirmation email
  if (customer.email) {
    await sendOrderConfirmationEmail(customer.email, {
      orderId: order.id,
      items: items,
      total: order.total,
      shippingAddress: customer,
    })
  }
}

async function handleFailedPayment(session: Stripe.Checkout.Session | Stripe.PaymentIntent) {
  const metadata = "metadata" in session ? session.metadata : {}
  const customer = JSON.parse(metadata?.customer || "{}")

  await prisma.order.updateMany({
    where: { stripeId: session.id },
    data: { status: "failed" },
  })

  // Send failure notification
  if (customer.email) {
    await sendOrderFailedEmail(customer.email, session.id)
  }
}

async function handleExpiredSession(session: Stripe.Checkout.Session) {
  if (session.payment_intent) {
    await prisma.order.updateMany({
      where: { stripeId: session.payment_intent as string },
      data: { status: "expired" },
    })
  }
}

async function handleRefund(charge: Stripe.Charge) {
  await prisma.order.updateMany({
    where: { stripeId: charge.payment_intent as string },
    data: { status: "refunded" },
  })
}

async function handleRefundUpdate(refund: Stripe.Refund) {
  const status = refund.status === "succeeded" ? "refunded" : "refund_pending"
  await prisma.order.updateMany({
    where: { stripeId: refund.payment_intent as string },
    data: { status },
  })
}

export async function updateDiscogsInventory(
  listingId: string, 
  quantityPurchased: number = 1
): Promise<boolean> {
  log(`Updating inventory for listing ${listingId}, quantity: ${quantityPurchased}`)
  
  try {
    // First, get the current listing to check its quantity
    const response = await fetchWithRetry(`${BASE_URL}/marketplace/listings/${listingId}`, {
      headers: {
        Authorization: `Discogs token=${process.env.DISCOGS_API_TOKEN}`,
        "User-Agent": "PlastikRecordStore/1.0",
      },
      retryOptions: {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 5000,
      },
    })
    
    if (!response.ok) {
      log(`Failed to fetch listing ${listingId}: ${response.status} ${response.statusText}`, "error")
      return false
    }
    
    const listing = await response.json()
    const currentQuantity = Number(listing.quantity || 0)
    
    if (currentQuantity <= quantityPurchased) {
      // If purchased all or more than available, delete the listing completely
      log(`Deleting listing ${listingId} as all items were purchased`)
      return removeFromDiscogsInventory(listingId)
    } else {
      // Otherwise, update the quantity
      const newQuantity = currentQuantity - quantityPurchased
      log(`Updating listing ${listingId} to quantity: ${newQuantity}`)
      
      const updateResponse = await fetchWithRetry(`${BASE_URL}/marketplace/listings/${listingId}`, {
        method: "POST",
        headers: {
          Authorization: `Discogs token=${process.env.DISCOGS_API_TOKEN}`,
          "User-Agent": "PlastikRecordStore/1.0",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          quantity: newQuantity,
        }),
        retryOptions: {
          maxRetries: 3,
          baseDelay: 1000,
          maxDelay: 5000,
        },
      })
      
      if (!updateResponse.ok) {
        log(`Failed to update listing ${listingId}: ${updateResponse.status} ${updateResponse.statusText}`, "error")
        return false
      }
      
      return true
    }
  } catch (error) {
    log(`Error updating inventory for listing ${listingId}: ${
      error instanceof Error ? error.message : "Unknown error"
    }`, "error")
    return false
  }
}

