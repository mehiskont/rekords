"use client"

import Image from "next/image"
import { Minus, Plus, X } from "lucide-react"
import { useCart } from "@/contexts/cart-context"
import { Button } from "@/components/ui/button"
import { calculatePriceWithoutFees } from "@/lib/price-calculator"
import type { CartItem as CartItemType } from "@/types/cart"

interface CartItemProps {
  item: CartItemType
}

export function CartItem({ item }: CartItemProps) {
  const { dispatch } = useCart()
  const price = calculatePriceWithoutFees(item.price)

  return (
    <div className="flex gap-4">
      <div className="relative w-20 h-20">
        <Image src={item.cover_image || "/placeholder.svg"} alt={item.title} fill className="object-cover rounded-md" />
      </div>
      <div className="flex-1">
        <h3 className="font-medium line-clamp-1">{item.title}</h3>
        <p className="text-sm text-muted-foreground">${price.toFixed(2)}</p>
        <div className="flex items-center gap-2 mt-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => {
              if (item.quantity > 1) {
                dispatch({
                  type: "UPDATE_QUANTITY",
                  payload: { id: item.id, quantity: item.quantity - 1 },
                })
              } else {
                dispatch({ type: "REMOVE_ITEM", payload: item.id })
              }
            }}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <span className="w-8 text-center">{item.quantity}</span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() =>
              dispatch({
                type: "UPDATE_QUANTITY",
                payload: { id: item.id, quantity: item.quantity + 1 },
              })
            }
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 ml-auto"
            onClick={() => dispatch({ type: "REMOVE_ITEM", payload: item.id })}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

