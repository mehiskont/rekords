"use client"

import type React from "react"

import Image from "next/image"
import { useCart } from "@/contexts/cart-context"
import { Button } from "@/components/ui/button"
import { calculatePriceWithoutFees } from "@/lib/price-calculator"
import { calculateShippingCost, calculateTotalWeight } from "@/lib/shipping-calculator"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { useState, useMemo, useEffect } from "react"
import Select from "react-select"
import countryList from "react-select-country-list"

interface CustomerInfo {
  firstName: string
  lastName: string
  email: string
  phone: string
  address: string
  apartment: string
  city: string
  postalCode: string
  state: string
  country: string
  shippingAddress: string
  shippingApartment: string
  shippingCity: string
  shippingPostalCode: string
  shippingState: string
  shippingCountry: string
  shippingAddressSameAsBilling: boolean
  acceptTerms: boolean
  subscribe: boolean
}

interface CartReviewProps {
  onNext: (data: CustomerInfo) => void
  isLoading: boolean
  initialData: CustomerInfo | null
}

export function CartReview({ onNext, isLoading, initialData }: CartReviewProps) {
  const { state } = useCart()
  const [shippingAddressSameAsBilling, setShippingAddressSameAsBilling] = useState(true)
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [subscribe, setSubscribe] = useState(false)
  const [billingCountry, setBillingCountry] = useState("")
  const [shippingCountry, setShippingCountry] = useState("")
  const [shippingCost, setShippingCost] = useState(0)

  const countryOptions = useMemo(() => countryList().getData(), [])

  const subtotal = state.items.reduce((sum, item) => sum + calculatePriceWithoutFees(item.price) * item.quantity, 0)
  const vat = subtotal * 0.2 // 20% VAT
  const total = subtotal + vat + shippingCost

  // Calculate shipping cost when country changes
  useEffect(() => {
    const countryToUse = shippingAddressSameAsBilling ? billingCountry : shippingCountry
    if (countryToUse) {
      const totalWeight = calculateTotalWeight(
        state.items.map((item) => ({
          weight: item.weight,
          quantity: item.quantity,
        })),
      )
      const cost = calculateShippingCost(totalWeight, countryToUse)
      setShippingCost(cost)
    }
  }, [billingCountry, shippingCountry, shippingAddressSameAsBilling, state.items])

  const customStyles = {
    control: (provided: any) => ({
      ...provided,
      backgroundColor: "var(--background)",
      borderColor: "var(--border)",
    }),
    menu: (provided: any) => ({
      ...provided,
      backgroundColor: "var(--background)",
    }),
    option: (provided: any, state: { isSelected: any; isFocused: any }) => ({
      ...provided,
      backgroundColor: state.isSelected ? "var(--primary)" : state.isFocused ? "var(--accent)" : "transparent",
      color: state.isSelected ? "var(--primary-foreground)" : "var(--foreground)",
    }),
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Add form validation here
    const formData = new FormData(e.target as HTMLFormElement)
    const data = Object.fromEntries(formData) as unknown as CustomerInfo
    onNext({
      ...data,
      country: billingCountry,
      shippingCountry: shippingAddressSameAsBilling ? billingCountry : shippingCountry,
      shippingAddressSameAsBilling,
      acceptTerms,
      subscribe,
    })
  }

  return (
    <div className="grid md:grid-cols-2 gap-8">
      <div className="space-y-8">
        <form onSubmit={handleSubmit}>
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Your Details</h2>
              <div className="text-sm">
                Have an account already? <button className="text-primary hover:underline">Login</button>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" name="firstName" required />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" name="lastName" required />
                </div>
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" required />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" type="tel" required />
              </div>
            </div>
          </div>

          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-4">Billing Address</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="address">Street Address</Label>
                <Input id="address" name="address" required />
              </div>
              <div>
                <Label htmlFor="apartment">Apartment, suite, etc. (optional)</Label>
                <Input id="apartment" name="apartment" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input id="city" name="city" required />
                </div>
                <div>
                  <Label htmlFor="postalCode">Postal Code</Label>
                  <Input id="postalCode" name="postalCode" required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="state">State/Province</Label>
                  <Input id="state" name="state" required />
                </div>
                <div>
                  <Label htmlFor="country">Country</Label>
                  <Select
                    options={countryOptions}
                    value={countryOptions.find((option) => option.value === billingCountry)}
                    onChange={(option) => setBillingCountry(option?.value || "")}
                    styles={customStyles}
                    className="react-select-container"
                    classNamePrefix="react-select"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {!shippingAddressSameAsBilling && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-4">Shipping Address</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="shippingAddress">Street Address</Label>
                  <Input id="shippingAddress" name="shippingAddress" required />
                </div>
                <div>
                  <Label htmlFor="shippingApartment">Apartment, suite, etc. (optional)</Label>
                  <Input id="shippingApartment" name="shippingApartment" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="shippingCity">City</Label>
                    <Input id="shippingCity" name="shippingCity" required />
                  </div>
                  <div>
                    <Label htmlFor="shippingPostalCode">Postal Code</Label>
                    <Input id="shippingPostalCode" name="shippingPostalCode" required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="shippingState">State/Province</Label>
                    <Input id="shippingState" name="shippingState" required />
                  </div>
                  <div>
                    <Label htmlFor="shippingCountry">Country</Label>
                    <Select
                      options={countryOptions}
                      value={countryOptions.find((option) => option.value === shippingCountry)}
                      onChange={(option) => setShippingCountry(option?.value || "")}
                      styles={customStyles}
                      className="react-select-container"
                      classNamePrefix="react-select"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4 mt-8">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="sameAddress"
                checked={shippingAddressSameAsBilling}
                onCheckedChange={(checked) => setShippingAddressSameAsBilling(checked as boolean)}
              />
              <Label htmlFor="sameAddress" className="text-sm">
                Shipping address same as billing address
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="subscribe"
                checked={subscribe}
                onCheckedChange={(checked) => setSubscribe(checked as boolean)}
              />
              <Label htmlFor="subscribe" className="text-sm">
                Subscribe to our newsletter
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="terms"
                checked={acceptTerms}
                onCheckedChange={(checked) => setAcceptTerms(checked as boolean)}
              />
              <Label htmlFor="terms" className="text-sm">
                I have read and agree to the Terms and Conditions
              </Label>
            </div>
          </div>

          <div className="flex justify-between mt-8">
            <Button type="button" variant="outline" onClick={() => window.history.back()}>
              Back to cart
            </Button>
            <Button type="submit" disabled={!acceptTerms || isLoading || !billingCountry}>
              {isLoading ? "Processing..." : "Proceed to Payment"}
            </Button>
          </div>
        </form>
      </div>

      <div className="bg-muted/50 p-6 rounded-lg">
        <h2 className="text-2xl font-bold mb-6">Order Summary</h2>
        <div className="space-y-4">
          {state.items.map((item) => (
            <div key={item.id} className="flex gap-4">
              <div className="relative w-20 h-20 flex-shrink-0">
                <Image
                  src={item.cover_image || "/placeholder.svg"}
                  alt={item.title}
                  fill
                  className="object-cover rounded-md"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium line-clamp-2">{item.title}</h3>
                <div className="text-sm text-muted-foreground">
                  <p>Media Condition: {item.condition}</p>
                  <p>Sleeve Condition: Generic</p>
                  <p>Quantity: {item.quantity}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium">${(calculatePriceWithoutFees(item.price) * item.quantity).toFixed(2)}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-6 border-t space-y-2">
          <div className="flex justify-between text-sm">
            <span>Items</span>
            <span>{state.items.length}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>VAT (20%)</span>
            <span>${vat.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Shipping</span>
            <span>${shippingCost.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold text-lg pt-2 border-t">
            <span>Total</span>
            <div className="text-right">
              <div>${total.toFixed(2)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

