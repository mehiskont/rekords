"use client"

import type React from "react"
import Image from "next/image"
import Link from "next/link"
import { ShoppingCart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { calculatePriceWithoutFees } from "@/lib/price-calculator"
import { toast } from "@/components/ui/use-toast"
import type { Record } from "@/types/record"
import type { CartState, CartAction } from "@/contexts/cart-context"

interface RecordCardProps {
  record: Record
  cartState: CartState
  cartDispatch: React.Dispatch<CartAction>
}

export function RecordCard({ record, cartState, cartDispatch }: RecordCardProps) {
  // Safeguard against undefined record
  if (!record) {
    return null
  }
  
  // Safeguard against undefined record.price
  if (typeof record.price !== "number") {
    console.warn("Record has invalid price:", record)
    record.price = 0
  }

  // No need to adjust price - use actual price from API
  // const price = calculatePriceWithoutFees(record.price)

  // Ensure we have a valid cart state
  const safeCartState = cartState || { items: [], isOpen: false }
  
  // Safeguard against undefined cartState
  const cartItem = safeCartState.items?.find((item) => item.id === record.id)
  const currentQuantityInCart = cartItem?.quantity || 0
  const isMaxQuantity = currentQuantityInCart >= (record.quantity || 0)

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault() // Prevent navigation when clicking the button

    // Ensure quantity is a valid number
    const qtyAvailable = record.quantity || 0

    if (isMaxQuantity) {
      toast({
        title: "Maximum quantity reached",
        description: `Only ${qtyAvailable} unit${qtyAvailable > 1 ? "s" : ""} available`,
        variant: "destructive",
      })
      return
    }

    try {
      // Only dispatch if the function is available
      if (typeof cartDispatch === 'function') {
        cartDispatch({ type: "ADD_ITEM", payload: record })
        toast({
          title: "Added to cart",
          description: "Item has been added to your cart",
        })
      } else {
        console.warn("Cart dispatch function not available")
        toast({
          title: "Could not add to cart",
          description: "Cart functionality is unavailable",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error adding item to cart:", error)
      toast({
        title: "Error",
        description: "Could not add item to cart",
        variant: "destructive",
      })
    }
  }

  const formatDisplay = Array.isArray(record.format) ? record.format.join(", ") : record.format
  const labelDisplay = record.label + (record.catalogNumber ? ` [${record.catalogNumber}]` : "")

  return (
    <Card className="flex flex-col overflow-hidden hover:shadow-md transition-shadow duration-200 h-full relative">
      <Link href={`/records/${record.id}`} className="flex flex-col h-full">
        {/* Cover image with hover effect */}
        <div className="relative aspect-square w-full overflow-hidden bg-black/5 dark:bg-black/20">
          <Image
            src={record.cover_image || "/placeholder.svg"}
            alt={record.title}
            fill
            className="object-cover transition-all duration-300 hover:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 16vw"
            quality={90}
            priority 
            onError={(e) => {
              const target = e.target as HTMLImageElement
              target.src = "/placeholder.svg"
            }}
          />
        </div>
        
        {/* Compact text content */}
        <CardHeader className="p-3 space-y-0.5">
          <CardTitle className="text-sm font-medium line-clamp-1">{record.title}</CardTitle>
          <p className="text-xs line-clamp-1">{record.artist}</p>
          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{labelDisplay}</p>
          <p className="text-xs text-muted-foreground line-clamp-1">{formatDisplay || "Unknown"}</p>
          <div className="text-sm font-semibold mt-1">${(record.price || 0).toFixed(2)}</div>
        </CardHeader>
      </Link>
      
      {/* Smaller Add to Cart button at the bottom */}
      <div className="p-2 pt-0">
        <Button
          className="w-full h-8 text-xs"
          size="sm"
          variant="secondary"
          onClick={handleAddToCart}
          disabled={isMaxQuantity || (record.quantity || 0) === 0 || record.status !== "FOR_SALE"}
        >
          <ShoppingCart className="mr-1 h-3 w-3" />
          {(record.quantity || 0) === 0 || record.status !== "FOR_SALE"
            ? "Out of Stock"
            : "Add to Cart"}
        </Button>
      </div>
    </Card>
  )
}

