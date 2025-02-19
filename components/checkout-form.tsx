"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useCart } from "@/contexts/cart-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { calculatePriceWithoutFees } from "@/lib/price-calculator"
import { loadStripe } from "@stripe/stripe-js"

export function CheckoutForm() {
  const router = useRouter()
  const { state, dispatch } = useCart()
  const [isLoading, setIsLoading] = useState(false)

  const total = state.items.reduce((sum, item) => sum + calculatePriceWithoutFees(item.price) * item.quantity, 0)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsLoading(true)

    const formData = new FormData(event.currentTarget)
    const customerData = Object.fromEntries(formData.entries())

    try {
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: state.items,
          customer: customerData,
        }),
      })

      if (!response.ok) throw new Error("Network response was not ok")

      const { sessionId } = await response.json()
      const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

      if (stripe) {
        const { error } = await stripe.redirectToCheckout({ sessionId })
        if (error) throw error
      }
    } catch (error) {
      console.error("Error:", error)
      // Handle error (e.g., show error message to user)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Full Name</Label>
        <Input id="name" name="name" required />
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required />
      </div>
      <div>
        <Label htmlFor="address">Address</Label>
        <Input id="address" name="address" required />
      </div>
      <div>
        <Label htmlFor="city">City</Label>
        <Input id="city" name="city" required />
      </div>
      <div>
        <Label htmlFor="country">Country</Label>
        <Input id="country" name="country" required />
      </div>
      <div>
        <Label htmlFor="postal_code">Postal Code</Label>
        <Input id="postal_code" name="postal_code" required />
      </div>
      <div className="font-semibold">Total: ${total.toFixed(2)}</div>
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "Processing..." : "Proceed to Payment"}
      </Button>
    </form>
  )
}

