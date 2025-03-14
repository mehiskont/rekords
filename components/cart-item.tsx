"use client"

import Image from "next/image"
import { Minus, Plus, X } from "lucide-react"
import { useCart } from "@/contexts/cart-context"
import { Button } from "@/components/ui/button"
import { calculatePriceWithoutFees } from "@/lib/price-calculator"
import { toast } from "@/components/ui/use-toast"
import type { CartItem as CartItemType } from "@/types/cart"

interface CartItemProps {
  item: CartItemType
}

export function CartItem({ item }: CartItemProps) {
  const { dispatch } = useCart()
  // Use the actual price instead of calculating without fees
  const price = item.price

  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity > item.quantity_available) {
      toast({
        title: "Maximum quantity reached",
        description: `Only ${item.quantity_available} units available`,
        variant: "destructive",
      })
      return
    }

    if (newQuantity < 1) {
      dispatch({ type: "REMOVE_ITEM", payload: item.id })
    } else {
      dispatch({
        type: "UPDATE_QUANTITY",
        payload: { id: item.id, quantity: newQuantity },
      })
    }
  }

  return (
    <div className="flex gap-4">
      <div className="relative w-20 h-20">
        <Image src={item.cover_image || "/placeholder.svg"} alt={item.title} fill className="object-cover rounded-md" />
      </div>
      <div className="flex-1">
        <h3 className="font-medium line-clamp-1">{item.title}</h3>
        <div className="text-sm space-y-1">
          <p className="text-muted-foreground">Price: ${price.toFixed(2)}</p>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => handleQuantityChange(item.quantity - 1)}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <span className="w-8 text-center">{item.quantity}</span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => handleQuantityChange(item.quantity + 1)}
            disabled={item.quantity >= item.quantity_available}
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
        {item.quantity === item.quantity_available && (
          <p className="text-xs text-muted-foreground mt-1">Maximum quantity reached</p>
        )}
      </div>
    </div>
  )
}

