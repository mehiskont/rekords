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
  const price = item.price
  const maxQuantity = item.stockQuantity || 0

  const handleQuantityChange = (newQuantity: number) => {
    const releaseId = item.discogsReleaseId;
    if (releaseId === undefined || releaseId === null) {
      console.error("Cannot update quantity: discogsReleaseId is missing", item);
      toast({ title: "Error", description: "Cannot update item quantity.", variant: "destructive" });
      return;
    }

    if (newQuantity > maxQuantity) {
      toast({
        title: "Maximum quantity reached",
        description: `Only ${maxQuantity} unit${maxQuantity === 1 ? '' : 's'} available`,
        variant: "destructive",
      })
      return
    }

    if (newQuantity < 1) {
      dispatch({ type: "REMOVE_ITEM", payload: releaseId })
    } else {
      dispatch({
        type: "UPDATE_QUANTITY",
        payload: { id: releaseId, quantity: newQuantity },
      })
    }
  }

  return (
    <div className="flex gap-4">
      <div className="relative w-20 h-20">
        <Image src={item.coverImage || "/placeholder.svg"} alt={item.title} fill className="object-cover rounded-md" />
      </div>
      <div className="flex-1 flex">
        <div className="flex-1">
          <h3 className="font-medium line-clamp-1">{item.title}</h3>
          <div className="text-sm space-y-1">
            <p className="text-muted-foreground">Price: ${price.toFixed(2)}</p>
          </div>
        </div>
       
        <div className="flex items-center gap-2">
         
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 ml-auto"
            onClick={() => {
              const releaseId = item.discogsReleaseId;
              if (releaseId === undefined || releaseId === null) {
                console.error("Cannot remove item: discogsReleaseId is missing", item);
                toast({ title: "Error", description: "Cannot remove item.", variant: "destructive" });
                return;
              }
              dispatch({ type: "REMOVE_ITEM", payload: releaseId })
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

