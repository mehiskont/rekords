"use client"

import { useState } from "react"
import { useCart } from "@/contexts/cart-context"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { CartItem } from "@/components/cart-item"
import { CheckoutForm } from "@/components/checkout-form"
import { calculatePriceWithoutFees } from "@/lib/price-calculator"

export function Cart() {
  const { state, dispatch } = useCart()
  const [isCheckingOut, setIsCheckingOut] = useState(false)

  const total = state.items.reduce((sum, item) => sum + calculatePriceWithoutFees(item.price) * item.quantity, 0)

  return (
    <Sheet open={state.isOpen} onOpenChange={() => dispatch({ type: "TOGGLE_CART" })}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{isCheckingOut ? "Checkout" : "Shopping Cart"}</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col h-full">
          {isCheckingOut ? (
            <CheckoutForm />
          ) : (
            <>
              <div className="flex-1 overflow-y-auto py-4">
                {state.items.length === 0 ? (
                  <p className="text-center text-muted-foreground">Your cart is empty</p>
                ) : (
                  <div className="space-y-4">
                    {state.items.map((item) => (
                      <CartItem key={item.id} item={item} />
                    ))}
                  </div>
                )}
              </div>
              {state.items.length > 0 && (
                <div className="border-t pt-4">
                  <div className="flex justify-between mb-4">
                    <span>Total</span>
                    <span className="font-semibold">${total.toFixed(2)}</span>
                  </div>
                  <Button className="w-full" onClick={() => setIsCheckingOut(true)}>
                    Proceed to Checkout
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

