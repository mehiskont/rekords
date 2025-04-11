"use client"

import React, { useState } from "react"
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
  // Local state to track adding process
  const [isAdding, setIsAdding] = useState(false);

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
  
  // Find item in cart using discogsReleaseId for consistency
  const cartItem = safeCartState.items?.find((item) => 
    item.discogsReleaseId !== undefined && 
    String(item.discogsReleaseId) === String(record.discogsReleaseId)
  );
  const currentQuantityInCart = cartItem?.quantity || 0
  const availableQuantity = record.quantity || 0
  const isOutOfStock = availableQuantity === 0 || record.status !== "FOR_SALE"
  const isAlreadyInCart = cartItem !== undefined && currentQuantityInCart > 0

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault()

    // Prevent adding if already adding, out of stock, or already in cart
    if (isAdding || isOutOfStock || isAlreadyInCart) {
      // Optionally show a toast if needed, but button disable should suffice
      return;
    }

    // Immediately set state to indicate adding process started
    setIsAdding(true);

    try {
      if (typeof cartDispatch === 'function') {
        // Use Discogs ID in payload for consistency with reducer
        cartDispatch({ type: "ADD_ITEM", payload: record })
        toast({
          title: "Added to cart",
          description: "Item has been added to your cart",
        })
        // Note: We don't set isAdding back to false here.
        // The button state will rely on isAlreadyInCart becoming true 
        // when the cartState prop updates.
      } else {
        console.warn("Cart dispatch function not available")
        toast({
          title: "Could not add to cart",
          description: "Cart functionality is unavailable",
          variant: "destructive",
        })
        setIsAdding(false); // Reset if dispatch failed
      }
    } catch (error) {
      console.error("Error adding item to cart:", error)
      toast({
        title: "Error",
        description: "Could not add item to cart",
        variant: "destructive",
      })
      setIsAdding(false); // Reset on error
    }
  }

  const formatDisplay = Array.isArray(record.format) ? record.format.join(", ") : record.format
  const labelDisplay = record.label + (record.catalogNumber ? ` [${record.catalogNumber}]` : "")

  return (
    <Card className="flex flex-col overflow-hidden hover:shadow-md transition-shadow duration-200 h-full relative">
      {/* Ensure internal ID is present before creating the link */}
      {record && record.id ? (
        <Link href={`/records/${record.id}`} className="flex flex-col h-full">
          {/* Cover image with hover effect */}
          <div className="relative aspect-square w-full overflow-hidden bg-black/5 dark:bg-black/20">
            <Image
              src={record.coverImage || "/placeholder.svg"}
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
      ) : (
        // Fallback rendering if internal ID is missing
        <div className="flex flex-col h-full">
          {/* Render content without link */}
          <div className="relative aspect-square w-full overflow-hidden bg-black/5 dark:bg-black/20">
            <Image
              src={record?.coverImage || "/placeholder.svg"}
              alt={record?.title || 'Record'} 
              fill
              className="object-cover transition-all duration-300" 
              sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 16vw"
              quality={90}
              priority 
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.src = "/placeholder.svg"
              }}
            />
          </div>
          <CardHeader className="p-3 space-y-0.5">
            <CardTitle className="text-sm font-medium line-clamp-1">{record?.title}</CardTitle>
            <p className="text-xs line-clamp-1">{record?.artist}</p>
            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{labelDisplay}</p>
            <p className="text-xs text-muted-foreground line-clamp-1">{formatDisplay || "Unknown"}</p>
            <div className="text-sm font-semibold mt-1">${(record?.price || 0).toFixed(2)}</div>
          </CardHeader>
        </div>
      )}
      
      {/* Smaller Add to Cart button at the bottom */}
      <div className="p-2 pt-0">
        <Button
          className="w-full h-8 text-xs"
          size="sm"
          variant="secondary"
          onClick={handleAddToCart}
          // Disable if out of stock, already in cart, OR currently being added
          disabled={isOutOfStock || isAlreadyInCart || isAdding}
        >
          <ShoppingCart className="mr-1 h-3 w-3" />
          {/* Update button text based on states */}
          {isOutOfStock
            ? "Out of Stock"
            : isAdding 
            ? "Adding..." 
            : isAlreadyInCart 
            ? "In Cart"
            : "Add to Cart"}
        </Button>
      </div>
    </Card>
  )
}

