"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useCart } from "@/contexts/cart-context"
import { CartReview } from "@/components/checkout/CartReview"
import { PaymentForm } from "@/components/checkout/PaymentForm"
import { calculatePriceWithoutFees } from "@/lib/price-calculator"
import { toast } from "@/components/ui/use-toast"
import { calculateShippingCost, calculateTotalWeight } from "@/lib/shipping-calculator"
import { profileToCheckoutInfo, CheckoutInfo } from "@/lib/user"

const steps = ["DETAILS", "PAYMENT"]
const STORAGE_KEY = "checkout_current_step"

export interface CustomerInfo {
  firstName: string
  lastName: string
  email: string
  phone: string
  address: string
  apartment?: string
  city: string
  state: string
  postalCode: string
  country: string
  shippingAddress?: string
  shippingApartment?: string
  shippingCity?: string
  shippingState?: string
  shippingPostalCode?: string
  shippingCountry?: string
  shippingAddressSameAsBilling: boolean
}

export function CheckoutFlow() {
  const [currentStep, setCurrentStep] = useState(0)
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [shippingCost, setShippingCost] = useState(2.99) // Default to Estonian rate
  const router = useRouter()
  const { state: cartState, dispatch: cartDispatch } = useCart()
  const { data: session, status } = useSession()

  // Calculate totals
  // Use the actual price instead of calculating without fees
  const subtotal = cartState.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const total = subtotal + shippingCost

  // Load saved step on mount
  useEffect(() => {
    const savedStep = localStorage.getItem(STORAGE_KEY)
    if (savedStep) {
      setCurrentStep(Number.parseInt(savedStep))
    }
  }, [])

  // Load user profile data if logged in
  useEffect(() => {
    async function loadUserProfile() {
      if (status === 'authenticated' && session.user) {
        try {
          setLoadingProfile(true)
          
          // First, try to load from localStorage (most recent)
          const savedData = localStorage.getItem("checkout_customer_info")
          if (savedData) {
            const parsedData = JSON.parse(savedData)
            setCustomerInfo(parsedData)
            setLoadingProfile(false)
            return
          }
          
          // If no saved data, load from user profile
          const response = await fetch("/api/user/profile")
          if (response.ok) {
            const profile = await response.json()
            const checkoutInfo = profileToCheckoutInfo(profile)
            
            // Set the checkout form data from user profile
            if (Object.keys(checkoutInfo).length > 0) {
              setCustomerInfo(checkoutInfo as CustomerInfo)
            }
          }
        } catch (error) {
          console.error("Error loading user profile:", error)
        } finally {
          setLoadingProfile(false)
        }
      }
    }
    
    loadUserProfile()
  }, [status, session])

  // Save current step whenever it changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, currentStep.toString())
  }, [currentStep])

  const handleDetailsSubmit = async (data: CustomerInfo) => {
    setIsLoading(true)
    setCustomerInfo(data)
    
    // Save checkout info to localStorage for next time
    localStorage.setItem("checkout_customer_info", JSON.stringify(data))
    
    // If user is logged in, save checkout info to their profile
    if (session?.user) {
      try {
        await fetch("/api/user/profile", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            address: data.address,
            city: data.city,
            state: data.state,
            country: data.country,
            postalCode: data.postalCode,
          }),
        })
        console.log("Saved checkout info to user profile")
      } catch (error) {
        console.error("Error saving checkout info to profile:", error)
        // Continue with checkout even if saving to profile fails
      }
    }

    try {
      // Calculate shipping cost based on the selected country and cart items
      const totalWeight = calculateTotalWeight(
        cartState.items.map((item) => ({
          weight: item.weight,
          quantity: item.quantity,
        })),
      )
      
      // Get destination country
      const destinationCountry = data.shippingAddressSameAsBilling ? data.country : data.shippingCountry || data.country;
      console.log(`Calculating shipping to: ${destinationCountry}, sameAddress: ${data.shippingAddressSameAsBilling}`);
      
      // For Estonia, always use flat rate - Check for 'estonia', 'eesti', or 'ee' (country code)
      let shippingCost;
      const countryLower = (destinationCountry || '').toLowerCase();
      
      if (countryLower === 'estonia' || countryLower === 'eesti' || countryLower === 'ee') {
        shippingCost = 2.99; // Fixed rate for Estonia
        console.log(`Using fixed Estonian shipping rate: €${shippingCost}`);
      } else if (!destinationCountry) {
        // Default to Estonian rate if no country
        shippingCost = 2.99;
        console.log(`No country selected, defaulting to Estonian rate: €${shippingCost}`);
      } else {
        shippingCost = calculateShippingCost(totalWeight, destinationCountry);
        console.log(`Calculated international shipping rate: €${shippingCost}`);
      }
      setShippingCost(shippingCost)

      // Create payment intent with updated total including shipping
      const response = await fetch("/api/create-payment-intent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: subtotal + shippingCost, // Calculate total here to ensure correct amount
          customer: {
            ...data,
            email: session?.user?.email || data.email,
          },
          items: cartState.items.map((item) => ({
            id: item.id,
            title: item.title,
            price: item.price,
            quantity: item.quantity,
          })),
          shipping: shippingCost,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to create payment intent")
      }

      const { clientSecret } = await response.json()
      setClientSecret(clientSecret)
      setCurrentStep(1) // Move to payment step
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
    
    // Don't clear customer info so it can be used next time
    // localStorage.removeItem("checkout_customer_info")

    // Clear the cart
    cartDispatch({ type: "CLEAR_CART" })

    // Redirect to success page
    router.push("/checkout/success")
  }

  // If cart is empty and not in payment step, redirect to cart
  useEffect(() => {
    if (cartState.items.length === 0 && currentStep !== 1) {
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
        {currentStep === 0 && (
          <CartReview 
            onNext={handleDetailsSubmit} 
            isLoading={isLoading || loadingProfile} 
            initialData={customerInfo} 
          />
        )}
        {currentStep === 1 && clientSecret && (
          <PaymentForm
            clientSecret={clientSecret}
            total={total}
            subtotal={subtotal}
            shippingCost={shippingCost}
            onSuccess={handlePaymentSuccess}
          />
        )}
      </div>
    </div>
  )
}

