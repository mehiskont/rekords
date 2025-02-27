"use client"

import Image from "next/image"
import { useCart } from "@/contexts/cart-context"
import { Button } from "@/components/ui/button"
import { calculatePriceWithoutFees } from "@/lib/price-calculator"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { useState, useMemo } from "react"
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

// Update the CartReviewProps interface
interface CartReviewProps {
  onNext: (data: CustomerInfo) => void
  isLoading: boolean
  initialData: CustomerInfo | null
  shippingCost: number
}

// Update the component to accept shippingCost
export function CartReview({ onNext, isLoading, initialData, shippingCost }: CartReviewProps) {
  const { state } = useCart()
  const [shippingAddressSameAsBilling, setShippingAddressSameAsBilling] = useState(true)
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [subscribe, setSubscribe] = useState(false)
  const [billingCountry, setBillingCountry] = useState("")
  const [shippingCountry, setShippingCountry] = useState("")

  const countryOptions = useMemo(() => countryList().getData(), [])

  const subtotal = state.items.reduce((sum, item) => sum + calculatePriceWithoutFees(item.price) * item.quantity, 0)
  const vat = subtotal * 0.2 // 20% VAT
  // Update the total calculation
  const total = subtotal + vat + shippingCost

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

  return (
    <div className="grid md:grid-cols-2 gap-8">
      {/* Left Column - Your Details */}
      <div className="space-y-8">
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
                <Input id="firstName" />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input id="lastName" />
              </div>
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" type="tel" />
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-4">Billing Address</h3>
          <div className="space-y-4">
            <div>
              <Label htmlFor="address">Street Address</Label>
              <Input id="address" />
            </div>
            <div>
              <Label htmlFor="apartment">Apartment, suite, etc. (optional)</Label>
              <Input id="apartment" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="city">City</Label>
                <Input id="city" />
              </div>
              <div>
                <Label htmlFor="postalCode">Postal Code</Label>
                <Input id="postalCode" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="state">State/Province</Label>
                <Input id="state" />
              </div>
              <div>
                <Label htmlFor="country">Country</Label>
                <Select
                  options={countryOptions}
                  value={countryOptions.find((option) => option.value === billingCountry)}
                  onChange={(option: any) => setBillingCountry(option?.value)}
                  styles={customStyles}
                  className="react-select-container"
                  classNamePrefix="react-select"
                />
              </div>
            </div>
          </div>
        </div>

        {!shippingAddressSameAsBilling && (
          <div>
            <h3 className="text-lg font-semibold mb-4">Shipping Address</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="shippingAddress">Street Address</Label>
                <Input id="shippingAddress" />
              </div>
              <div>
                <Label htmlFor="shippingApartment">Apartment, suite, etc. (optional)</Label>
                <Input id="shippingApartment" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="shippingCity">City</Label>
                  <Input id="shippingCity" />
                </div>
                <div>
                  <Label htmlFor="shippingPostalCode">Postal Code</Label>
                  <Input id="shippingPostalCode" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="shippingState">State/Province</Label>
                  <Input id="shippingState" />
                </div>
                <div>
                  <Label htmlFor="shippingCountry">Country</Label>
                  <Select
                    options={countryOptions}
                    value={countryOptions.find((option) => option.value === shippingCountry)}
                    onChange={(option: any) => setShippingCountry(option?.value)}
                    styles={customStyles}
                    className="react-select-container"
                    classNamePrefix="react-select"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
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

        <div className="flex justify-between">
          <Button variant="outline" onClick={() => window.history.back()}>
            Back to cart
          </Button>
          <Button onClick={onNext} disabled={!acceptTerms}>
            Proceed to shipping
          </Button>
        </div>
      </div>

      {/* Right Column - Order Summary */}
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
            <span>VAT</span>
            <span>${vat.toFixed(2)}</span>
          </div>
          {/* Add this to the order summary section */}
          <div className="flex justify-between text-sm">
            <span>Shipping</span>
            <span>${shippingCost.toFixed(2)}</span>
          </div>
          {/* Update the total display */}
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

