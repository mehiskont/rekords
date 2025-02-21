"use client"

import type React from "react"
import Image from "next/image"
import Link from "next/link"
import { ShoppingCart } from "lucide-react"
import { useCart } from "@/contexts/cart-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { calculatePriceWithoutFees } from "@/lib/price-calculator"
import { toast } from "@/components/ui/use-toast"
import type { DiscogsRecord } from "@/types/discogs"

interface RecordCardProps {
  record: DiscogsRecord
}

export function RecordCard({ record }: RecordCardProps) {
  const { state, dispatch } = useCart()
  const price = calculatePriceWithoutFees(record.price)

  const cartItem = state.items.find((item) => item.id === record.id)
  const currentQuantityInCart = cartItem?.quantity || 0
  const isMaxQuantity = currentQuantityInCart >= record.quantity_available

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault() // Prevent navigation when clicking the button

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
    <Card>
      <Link href={`/records/${record.id}`}>
        <CardHeader className="space-y-1">
          <CardTitle className="text-lg line-clamp-2">{record.title}</CardTitle>
          <p className="text-m line-clamp-1">{record.artist}</p>
          <p className="text-xs text-muted-foreground line-clamp-1">{labelDisplay}</p>
        </CardHeader>
        <CardContent>
          <div className="aspect-square relative mb-4 bg-muted">
            <Image
              src={record.cover_image || "/placeholder.svg"}
              alt={record.title}
              fill
              className="object-cover rounded-md"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              priority={false}
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.src = "/placeholder.svg"
              }}
            />
          </div>
          <div className="flex justify-between items-center">
            <div className="text-lg font-semibold">${price.toFixed(2)}</div>
            <div className="text-sm text-muted-foreground line-through">${record.price.toFixed(2)}</div>
          </div>
          <div className="mt-2 text-sm">
            <span className="font-semibold">Format:</span> {formatDisplay}
          </div>
          {record.styles && record.styles.length > 0 && (
            <div className="mt-1 text-sm">
              <span className="font-semibold">Styles:</span> {record.styles.join(", ")}
            </div>
          )}
          {record.quantity_available > 0 && (
            <div className="mt-1 text-sm text-muted-foreground">
              {record.quantity_available} unit{record.quantity_available > 1 ? "s" : ""} available
            </div>
          )}
        </CardContent>
      </Link>
      <CardFooter>
        <Button
          className="w-full"
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
      </CardFooter>
    </Card>
  )
}

