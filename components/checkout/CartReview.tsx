"use client"

import { useCart } from "@/contexts/cart-context"
import { Button } from "@/components/ui/button"
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
      <h2 className="text-2xl font-bold mb-4">Review Your Cart</h2>
      {state.items.length === 0 ? (
        <p className="text-center text-muted-foreground">Your cart is empty</p>
      ) : (
        <div className="space-y-4">
          {state.items.map((item) => (
            <CartItem key={item.id} item={item} />
          ))}
          <div className="flex justify-between items-center font-bold text-lg mt-4">
            <span>Total:</span>
            <span>${total.toFixed(2)}</span>
          </div>
          <Button onClick={onNext} className="w-full">
            Proceed to Shipping
          </Button>
        </div>
      )}
    </div>
  )
}

