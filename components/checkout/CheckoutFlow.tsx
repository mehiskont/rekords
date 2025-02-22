"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useCart } from "@/contexts/cart-context"
import { Button } from "@/components/ui/button"
import { CartReview } from "@/components/checkout/CartReview"
import { ShippingForm } from "@/components/checkout/ShippingForm"
import { PaymentForm } from "@/components/checkout/PaymentForm"
import { OrderSummary } from "@/components/checkout/OrderSummary"

const steps = ["Cart Review", "Shipping", "Payment", "Summary"]

export function CheckoutFlow() {
  const [currentStep, setCurrentStep] = useState(0)
  const [shippingInfo, setShippingInfo] = useState({})
  const [paymentInfo, setPaymentInfo] = useState({})
  const router = useRouter()
  const { data: session } = useSession()
  const { state: cartState, dispatch: cartDispatch } = useCart()

  const nextStep = () => setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1))
  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 0))

  const handleShippingSubmit = (data: any) => {
    setShippingInfo(data)
    nextStep()
  }

  const handlePaymentSubmit = (data: any) => {
    setPaymentInfo(data)
    nextStep()
  }

  const handlePlaceOrder = async () => {
    // Implement order placement logic here
    // This should include creating the order in your backend
    // and handling the payment process
    console.log("Placing order:", { shippingInfo, paymentInfo, cartItems: cartState.items })

    // For now, we'll just clear the cart and redirect to a success page
    cartDispatch({ type: "CLEAR_CART" })
    router.push("/checkout/success")
  }

  return (
    <div className="max-w-3xl mx-auto">
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

      {currentStep === 0 && <CartReview onNext={nextStep} />}
      {currentStep === 1 && <ShippingForm onSubmit={handleShippingSubmit} />}
      {currentStep === 2 && <PaymentForm onSubmit={handlePaymentSubmit} />}
      {currentStep === 3 && (
        <OrderSummary
          shippingInfo={shippingInfo}
          paymentInfo={paymentInfo}
          cartItems={cartState.items}
          onPlaceOrder={handlePlaceOrder}
        />
      )}

      <div className="mt-8 flex justify-between">
        {currentStep > 0 && (
          <Button onClick={prevStep} variant="outline">
            Back
          </Button>
        )}
        {currentStep < steps.length - 1 && (
          <Button onClick={nextStep} className="ml-auto">
            Next
          </Button>
        )}
      </div>
    </div>
  )
}

