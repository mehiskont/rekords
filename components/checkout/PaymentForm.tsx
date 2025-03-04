"use client"

import type React from "react"
import { useState } from "react"
import { loadStripe } from "@stripe/stripe-js"
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface PaymentFormProps {
  clientSecret: string
  total: number
  subtotal: number
  vat: number
  shippingCost: number
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

      // Get stored session ID if available
      const storedSessionId = localStorage.getItem('checkout_session_id');
      
      const { error: paymentError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          // Include session_id query parameter to help success page create order
          return_url: `${window.location.origin}/success?session_id=${encodeURIComponent(storedSessionId || '')}`,
        },
        redirect: 'if_required', // Only redirect if 3D Secure is required
      })

      if (paymentError) {
        throw new Error(paymentError.message)
      }

      if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Payment complete without redirect, manually navigate to success page
        console.log("Payment succeeded without redirect, navigating to success page");
        window.location.href = "/checkout/success";
      } else if (paymentIntent) {
        console.log(`Payment status: ${paymentIntent.status}`);
        // For other statuses, call the success handler which might redirect
        onSuccess();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="mt-6">
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
      </div>
    </form>
  )
}

export function PaymentForm({ clientSecret, total, subtotal, vat, shippingCost, onSuccess }: PaymentFormProps) {
  // Extract session ID from URL - it's appended to the URL after successful payment intent creation
  const searchParams = new URLSearchParams(window.location.search);
  const sessionId = searchParams.get('session_id') || '';
  
  // Store the session ID in localStorage so we can use it on redirect
  if (sessionId) {
    localStorage.setItem('checkout_session_id', sessionId);
    console.log("Stored checkout session ID:", sessionId);
  }
  
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
    <div className="max-w-2xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold mb-6">Payment Information</h2>

      <div className="bg-muted/50 p-4 rounded-lg mb-6">
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>VAT (20%)</span>
            <span>${vat.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Shipping</span>
            <span>${shippingCost.toFixed(2)}</span>
            <span className="text-xs text-muted-foreground ml-1">(based on weight & destination)</span>
          </div>
          <div className="flex justify-between font-bold pt-2 border-t">
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </div>
      </div>

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

