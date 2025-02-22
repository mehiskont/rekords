"use client"

import type React from "react"

import { useState } from "react"
import * as z from "zod"
import { loadStripe } from "@stripe/stripe-js"
import { Elements, PaymentElement, useStripe, useElements, LinkAuthenticationElement } from "@stripe/react-stripe-js"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

const paymentSchema = z.object({
  method: z.enum(["card", "apple-pay", "paypal"]),
})

type PaymentFormValues = z.infer<typeof paymentSchema>

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
  const [paymentMethod, setPaymentMethod] = useState<"card" | "apple-pay" | "paypal">("card")

  const options: any = {
    clientSecret,
    appearance: {
      theme: "stripe",
    },
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold mb-6">Payment Method</h2>
      <RadioGroup
        defaultValue="card"
        value={paymentMethod}
        onValueChange={(value) => setPaymentMethod(value as "card" | "apple-pay" | "paypal")}
        className="grid grid-cols-3 gap-4"
      >
        <div>
          <RadioGroupItem value="card" id="card" className="peer sr-only" />
          <Label
            htmlFor="card"
            className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mb-3 h-6 w-6"
            >
              <rect width="20" height="14" x="2" y="5" rx="2" />
              <line x1="2" x2="22" y1="10" y2="10" />
            </svg>
            Card
          </Label>
        </div>
        <div>
          <RadioGroupItem value="apple-pay" id="apple-pay" className="peer sr-only" />
          <Label
            htmlFor="apple-pay"
            className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mb-3 h-6 w-6"
            >
              <path d="M12 20.94c1.5 0 2.75 1.06 4 1.06 3 0 6-8 6-12.22A4.91 4.91 0 0 0 17 5c-2.22 0-4 1.44-5 2-1-.56-2.78-2-5-2a4.9 4.9 0 0 0-5 4.78C2 14 5 22 8 22c1.25 0 2.5-1.06 4-1.06Z" />
              <path d="M10 2c1 .5 2 2 2 5" />
            </svg>
            Apple Pay
          </Label>
        </div>
        <div>
          <RadioGroupItem value="paypal" id="paypal" className="peer sr-only" />
          <Label
            htmlFor="paypal"
            className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mb-3 h-6 w-6"
            >
              <path d="M17.4 7.8C19.3 8.7 20 10 20 12c0 2.5-2.5 4.5-5.5 4.5h-4l-1 5.5H6.8L10 9.8m2-5H8.6c-2 0-3.6 1.6-3.6 3.5 0 1.9 1.4 3.5 3.2 3.5h4.2L13 7.8" />
            </svg>
            PayPal
          </Label>
        </div>
      </RadioGroup>

      <div className="mt-6">
        {paymentMethod === "card" && (
          <Elements stripe={stripePromise} options={options}>
            <StripePaymentForm onSuccess={onSuccess} />
          </Elements>
        )}
      </div>
    </div>
  )
}

