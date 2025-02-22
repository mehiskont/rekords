"use client"

import { useCart } from "@/contexts/cart-context"
import { CartItem } from "@/components/cart-item"
import { calculatePriceWithoutFees } from "@/lib/price-calculator"

interface CartReviewProps {
  onNext: () => void
}

export function CartReview({ onNext }: CartReviewProps) {
  const { state } = useCart()

  const total = state.items.reduce((sum, item) => sum + calculatePriceWithoutFees(item.price) * item.quantity, 0)

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
          <div className="flex justify-between items-center text-lg">
            <span className="font-medium">Total:</span>
            <span className="font-bold">${total.toFixed(2)}</span>
          </div>
        </div>
      )}
    </div>
  )
}

