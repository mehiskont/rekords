import { redirect } from "next/navigation"
import Link from "next/link"
import Stripe from "stripe"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

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

  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["line_items"],
  })

  if (!session) {
    redirect("/")
  }

  const customerEmail = session.customer_details?.email
  const total = session.amount_total ? (session.amount_total / 100).toFixed(2) : "0.00"
  const orderNumber = session.id.slice(-8).toUpperCase()

  return (
    <div className="container max-w-2xl mx-auto px-4 py-8">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Thank you for your order!</CardTitle>
          <CardDescription>We&apos;ve sent a confirmation email to {customerEmail}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg bg-muted p-6">
            <h3 className="font-semibold mb-2">Order Details</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Order Number:</span>
                <span className="font-mono">{orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>Total:</span>
                <span>${total}</span>
              </div>
            </div>
          </div>

          <div className="space-y-2 text-center">
            <p className="text-muted-foreground">
              {session.metadata?.createAccount === "true"
                ? "Your account has been created. Check your email for login instructions."
                : "Create an account to track your orders and get faster checkout next time."}
            </p>
            <div className="flex gap-4 justify-center">
              <Button asChild>
                <Link href="/">Continue Shopping</Link>
              </Button>
              {session.metadata?.createAccount !== "true" && (
                <Button variant="outline" asChild>
                  <Link href="/auth/signin">Sign In</Link>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

