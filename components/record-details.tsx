"use client"

import Image from "next/image"
import { Button } from "@/components/ui/button"
import { ShoppingCart } from "lucide-react"
import { useCart } from "@/contexts/cart-context"
import { calculatePriceWithoutFees } from "@/lib/price-calculator"
import { toast } from "@/components/ui/use-toast"
import type { DiscogsRecord } from "@/types/discogs"

interface RecordDetailsProps {
  record: DiscogsRecord
}

export function RecordDetails({ record }: RecordDetailsProps) {
  const { state, dispatch } = useCart()
  // Use the actual price instead of calculating without fees
  const price = record.price

  const cartItem = state.items.find((item) => item.id === record.id)
  const currentQuantityInCart = cartItem?.quantity || 0
  const isMaxQuantity = currentQuantityInCart >= record.quantity_available

  const handleAddToCart = () => {
    if (isMaxQuantity) {
      toast({
        title: "Maximum quantity reached",
        description: `Only ${record.quantity_available} unit${record.quantity_available > 1 ? "s" : ""} available`,
        variant: "destructive",
      })
      return
    }

    dispatch({ type: "ADD_ITEM", payload: record })
    toast({
      title: "Added to cart",
      description: "Item has been added to your cart",
    })
  }

  const labelDisplay = record.catalogNumber ? `${record.label} [${record.catalogNumber}]` : record.label
  const formatDisplay = Array.isArray(record.format) ? record.format.join(", ") : record.format

  return (
    <div className="grid md:grid-cols-2 gap-8 mb-12">
      <div className="relative aspect-square">
        <Image
          src={record.cover_image || "/placeholder.svg"}
          alt={record.title}
          fill
          className="object-contain rounded-lg"
          sizes="(max-width: 768px) 100vw, 50vw"
          priority
        />
      </div>
      <div className="flex flex-col justify-center">
        <h1 className="text-3xl font-bold mb-2">{record.title}</h1>
        <p className="text-xl mb-4">{record.artist}</p>
        <div className="space-y-2 mb-6">
          <p className="text-2xl font-bold">${(record.price || 0).toFixed(2)}</p>
          <p>Condition: {record.condition}</p>
          <p>Label: {labelDisplay}</p>
          <p>Format: {formatDisplay}</p>
          {record.styles && record.styles.length > 0 && <p>Styles: {record.styles.join(", ")}</p>}
          {record.country && <p>Country: {record.country}</p>}
          {record.released && <p>Released: {record.released}</p>}
          {record.quantity_available > 0 && (
            <p className="text-sm text-muted-foreground">
              {record.quantity_available} unit{record.quantity_available > 1 ? "s" : ""} available
            </p>
          )}
        </div>
        <Button
          size="lg"
          className="w-full md:w-auto"
          onClick={handleAddToCart}
          disabled={isMaxQuantity || record.quantity_available === 0}
        >
          <ShoppingCart className="mr-2 h-4 w-4" />
          {record.quantity_available === 0
            ? "Out of Stock"
            : isMaxQuantity
              ? `Max Quantity (${record.quantity_available}) Reached`
              : "Add to Cart"}
        </Button>
      </div>
    </div>
  )
}

