"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useCart } from "@/contexts/cart-context"
import { Button } from "@/components/ui/button"
import { CartReview } from "@/components/checkout/CartReview"
import { ShippingForm } from "@/components/checkout/ShippingForm"
import { PaymentForm } from "@/components/checkout/PaymentForm"
import { calculatePriceWithoutFees } from "@/lib/price-calculator"
import { toast } from "@/components/ui/use-toast"

const steps = ["Cart Review", "Shipping", "Payment"]
const STORAGE_KEY = "checkout_current_step"

export function CheckoutFlow() {
  const [currentStep, setCurrentStep] = useState(0)
  const [shippingInfo, setShippingInfo] = useState<any>(null)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { data: session } = useSession()
  const { state: cartState, dispatch: cartDispatch } = useCart()

  // Calculate totals including shipping
  const subtotal = cartState.items.reduce((sum, item) => sum + calculatePriceWithoutFees(item.price) * item.quantity, 0)
  const shippingTotal = cartState.items.reduce((sum, item) => sum + (item.shipping_price || 0) * item.quantity, 0)
  const total = subtotal + shippingTotal

  // Load saved step on mount
  useEffect(() => {
    const savedStep = localStorage.getItem(STORAGE_KEY)
    if (savedStep) {
      setCurrentStep(Number.parseInt(savedStep))
    }
  }, [])

  // Save current step whenever it changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, currentStep.toString())
  }, [currentStep])

  const nextStep = () => {
    const nextStepIndex = Math.min(currentStep + 1, steps.length - 1)
    setCurrentStep(nextStepIndex)
  }

  const prevStep = () => {
    const prevStepIndex = Math.max(currentStep - 1, 0)
    setCurrentStep(prevStepIndex)
  }

  const handleShippingSubmit = async (data: any) => {
    setIsLoading(true)
    setShippingInfo(data)

    try {
      // First, create an order in your database
      const orderResponse = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: cartState.items,
          customer: {
            ...data,
            email: session?.user?.email || data.email,
          },
          subtotal,
          shippingTotal,
          total,
        }),
      })

      if (!orderResponse.ok) {
        throw new Error("Failed to create order")
      }

      const { orderId } = await orderResponse.json()

      // Then, create a payment intent with Stripe
      const response = await fetch("/api/create-payment-intent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId,
          amount: total,
          customer: {
            email: session?.user?.email || data.email,
          },
          metadata: {
            subtotal: subtotal.toFixed(2),
            shipping: shippingTotal.toFixed(2),
          },
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to create payment intent")
      }

      const { clientSecret: secret } = await response.json()
      setClientSecret(secret)
      nextStep()
    } catch (error) {
      console.error("Error creating order and payment intent:", error)
      toast({
        title: "Error",
        description: "Failed to process order. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handlePaymentSuccess = () => {
    // Clear checkout-related storage when payment is successful
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem("checkout_shipping_info")

    // Clear the cart
    cartDispatch({ type: "CLEAR_CART" })

    // Redirect to success page
    router.push("/checkout/success")
  }

  // If cart is empty and not in payment step, redirect to cart
  useEffect(() => {
    if (cartState.items.length === 0 && currentStep !== 2) {
      router.push("/cart")
    }
  }, [cartState.items.length, currentStep, router])

  return (
    <div className="max-w-3xl mx-auto">
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          {steps.map((step, index) => (
            <div
              key={step}
              className={`flex-1 text-center ${index <= currentStep ? "text-primary" : "text-muted-foreground"}`}
            >
              <div className="relative">
                <div
                  className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center border-2 ${
                    index <= currentStep
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-muted-foreground"
                  }`}
                >
                  {index + 1}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`absolute top-1/2 w-full h-0.5 ${
                      index < currentStep ? "bg-primary" : "bg-muted-foreground"
                    }`}
                  />
                )}
              </div>
              <div className="mt-2">{step}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="space-y-6">
        {currentStep === 0 && <CartReview onNext={nextStep} />}

        {currentStep === 1 && (
          <ShippingForm onSubmit={handleShippingSubmit} isLoading={isLoading} initialData={shippingInfo} />
        )}

        {currentStep === 2 && clientSecret && (
          <PaymentForm
            clientSecret={clientSecret}
            total={total}
            subtotal={subtotal}
            shipping={shippingTotal}
            onSuccess={handlePaymentSuccess}
          />
        )}

        {/* Back Button */}
        {currentStep > 0 && currentStep < steps.length - 1 && (
          <div className="flex justify-start">
            <Button onClick={prevStep} variant="outline" disabled={isLoading}>
              Back
            </Button>
          </div>
        )}
      </div>

      {/* Order Summary */}
      <div className="mt-8 p-4 border rounded-lg bg-muted/50">
        <h3 className="font-semibold mb-4">Order Summary</h3>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Shipping</span>
            <span>${shippingTotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-semibold pt-2 border-t">
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

