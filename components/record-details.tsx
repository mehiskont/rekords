"use client"

import Image from "next/image"
import { Button } from "@/components/ui/button"
import { ShoppingCart } from "lucide-react"
import { useCart } from "@/contexts/cart-context"
import { calculatePriceWithoutFees } from "@/lib/price-calculator"
import type { DiscogsRecord } from "@/types/discogs"

interface RecordDetailsProps {
  record: DiscogsRecord
}

export function RecordDetails({ record }: RecordDetailsProps) {
  const { dispatch } = useCart()
  const price = calculatePriceWithoutFees(record.price)

  const handleAddToCart = () => {
    dispatch({ type: "ADD_ITEM", payload: record })
    dispatch({ type: "TOGGLE_CART" })
  }

  const labelDisplay = record.catalogNumber ? `${record.label} [${record.catalogNumber}]` : record.label

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
          <p className="text-2xl font-bold">${price.toFixed(2)}</p>
          <p>Condition: {record.condition}</p>
          <p>Label: {labelDisplay}</p>
          <p>Format: {record.format.join(", ")}</p>
          {record.styles && record.styles.length > 0 && <p>Styles: {record.styles.join(", ")}</p>}
          {record.country && <p>Country: {record.country}</p>}
          {record.released && <p>Released: {record.released}</p>}
        </div>
        <Button size="lg" className="w-full md:w-auto" onClick={handleAddToCart}>
          <ShoppingCart className="mr-2 h-4 w-4" />
          Add to Cart
        </Button>
      </div>
    </div>
  )
}

