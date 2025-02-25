"use client"

import { useCart } from "@/contexts/cart-context"
import { CartItem } from "@/components/cart-item"
import { Button } from "@/components/ui/button"
import { calculatePriceWithoutFees } from "@/lib/price-calculator"

interface CartReviewProps {
  onNext: () => void
}

export function CartReview({ onNext }: CartReviewProps) {
  const { state } = useCart()

  const subtotal = state.items.reduce((sum, item) => sum + calculatePriceWithoutFees(item.price) * item.quantity, 0)
  const shippingTotal = state.items.reduce((sum, item) => sum + (item.shipping_price || 0) * item.quantity, 0)
  const total = subtotal + shippingTotal

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Review Your Cart</h2>
      {state.items.length === 0 ? (
        <p className="text-center text-muted-foreground">Your cart is empty</p>
      ) : (
        <div className="space-y-6">
          {state.items.map((item) => (
            <CartItem key={item.id} item={item} />
          ))}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Shipping</span>
              <span>${shippingTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-lg font-bold pt-2 border-t">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>
          <div className="flex justify-end mt-6">
            <Button onClick={onNext} disabled={state.items.length === 0}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

