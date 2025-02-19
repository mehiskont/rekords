import { redirect } from "next/navigation"
import Stripe from "stripe"
import { Button } from "@/components/ui/button"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
})

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: { session_id: string }
}) {
  const sessionId = searchParams.session_id

  if (!sessionId) {
    redirect("/")
  }

  const session = await stripe.checkout.sessions.retrieve(sessionId)

  if (!session) {
    redirect("/")
  }

  // Here you would typically update your database with the order details
  // and remove the sold items from your Discogs inventory

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Thank you for your purchase!</h1>
      <p className="mb-4">Your order has been successfully processed.</p>
      <p className="mb-4">Order details:</p>
      <ul className="list-disc list-inside mb-4">
        <li>Order ID: {session.id}</li>
        <li>Total: ${(session.amount_total! / 100).toFixed(2)}</li>
        <li>Email: {session.customer_details?.email}</li>
      </ul>
      <Button href="/">Return to Home</Button>
    </div>
  )
}

