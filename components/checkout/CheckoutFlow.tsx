"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useCart } from "@/contexts/cart-context"
import { CartReview } from "@/components/checkout/CartReview"
import { ShippingForm } from "@/components/checkout/ShippingForm"
import { PaymentForm } from "@/components/checkout/PaymentForm"
import { calculatePriceWithoutFees } from "@/lib/price-calculator"
import { toast } from "@/components/ui/use-toast"

const steps = ["DETAILS", "SHIPPING", "PAYMENT"]
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
      // Create payment intent
      const response = await fetch("/api/create-payment-intent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: total,
          customer: {
            email: session?.user?.email || data.email,
          },
          metadata: {
            items: JSON.stringify(cartState.items),
            shipping: JSON.stringify(data),
          },
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to create payment intent")
      }

      const { clientSecret } = await response.json()
      setClientSecret(clientSecret)
      nextStep()
    } catch (error) {
      console.error("Error creating payment intent:", error)
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
    // Clear checkout-related storage
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
    <div className="max-w-6xl mx-auto">
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex justify-center items-center gap-4">
          {steps.map((step, index) => (
            <div key={step} className="flex items-center">
              {index > 0 && <div className="h-px w-16 bg-border mx-2" />}
              <div
                className={`flex items-center gap-2 ${index <= currentStep ? "text-primary" : "text-muted-foreground"}`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                    index <= currentStep
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-muted-foreground"
                  }`}
                >
                  {index + 1}
                </div>
                <span className="font-medium">{step}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="mt-8">
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
      </div>
    </div>
  )
}

