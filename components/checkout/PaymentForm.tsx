"use client"

import type React from "react"
import { useState } from "react"
import { loadStripe } from "@stripe/stripe-js"
import { Elements, PaymentElement, useStripe, useElements, LinkAuthenticationElement } from "@stripe/react-stripe-js"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface PaymentFormProps {
  clientSecret: string
  total: number
  onSuccess: () => void
}

function StripePaymentForm({ onSuccess }: { onSuccess: () => void }) {
  const stripe = useStripe()
  const elements = useElements()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return

    setIsLoading(true)
    setError(null)

    try {
      const { error: submitError } = await elements.submit()
      if (submitError) {
        throw new Error(submitError.message)
      }

      const { error: paymentError } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/checkout/success`,
        },
      })

      if (paymentError) {
        throw new Error(paymentError.message)
      }

      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <LinkAuthenticationElement />
      <PaymentElement />
      {error && <p className="text-sm text-red-500">{error}</p>}
      <Button type="submit" disabled={!stripe || isLoading} className="w-full">
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          "Pay Now"
        )}
      </Button>
    </form>
  )
}

export function PaymentForm({ clientSecret, total, onSuccess }: PaymentFormProps) {
  const options: any = {
    clientSecret,
    appearance: {
      theme: "stripe",
      variables: {
        colorPrimary: "#dc2626",
      },
    },
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold mb-6">Payment Information</h2>
      <div className="bg-muted/50 p-4 rounded-lg mb-6">
        <p className="text-sm text-muted-foreground">
          Test Card: 4242 4242 4242 4242
          <br />
          Expiry: Any future date
          <br />
          CVC: Any 3 digits
        </p>
      </div>
      <Elements stripe={stripePromise} options={options}>
        <StripePaymentForm onSuccess={onSuccess} />
      </Elements>
    </div>
  )
}

