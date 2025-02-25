"use client"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useCart } from "@/contexts/cart-context"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { CartItem } from "@/components/cart-item"
import { calculatePriceWithoutFees } from "@/lib/price-calculator"

export function Cart() {
  const router = useRouter()
  const { data: session } = useSession()
  const { state, dispatch } = useCart()

  const subtotal = state.items.reduce((sum, item) => sum + calculatePriceWithoutFees(item.price) * item.quantity, 0)
  const shippingTotal = state.items.reduce((sum, item) => sum + (item.shipping_price || 0) * item.quantity, 0)
  const total = subtotal + shippingTotal

  const handleCheckout = () => {
    dispatch({ type: "TOGGLE_CART" })
    router.push("/checkout")
  }

  const handleSignIn = () => {
    router.push("/auth/signin?callbackUrl=/checkout")
    dispatch({ type: "TOGGLE_CART" })
  }

  return (
    <Sheet open={state.isOpen} onOpenChange={() => dispatch({ type: "TOGGLE_CART" })}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Shopping Cart</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col h-full">
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
            <div className="border-t pt-4 space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping</span>
                  <span>${shippingTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>
              {session ? (
                <Button className="w-full" onClick={handleCheckout}>
                  Proceed to Checkout
                </Button>
              ) : (
                <div className="space-y-2">
                  <Button className="w-full" onClick={handleSignIn}>
                    Sign in to Checkout
                  </Button>
                  <Button variant="outline" className="w-full" onClick={handleCheckout}>
                    Continue as Guest
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

