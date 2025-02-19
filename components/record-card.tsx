"use client"

import Image from "next/image"
import Link from "next/link"
import { ShoppingCart } from "lucide-react"
import { useCart } from "@/contexts/cart-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { calculatePriceWithoutFees } from "@/lib/price-calculator"
import type { DiscogsRecord } from "@/types/discogs"

interface RecordCardProps {
  record: DiscogsRecord
}

export function RecordCard({ record }: RecordCardProps) {
  const { dispatch } = useCart()
  const price = calculatePriceWithoutFees(record.price)

  const handleAddToCart = () => {
    dispatch({ type: "ADD_ITEM", payload: record })
    dispatch({ type: "TOGGLE_CART" })
  }

  return (
    <Card>
      <Link href={`/records/${record.id}`}>
        <CardHeader>
          <CardTitle className="line-clamp-1">{record.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="aspect-square relative mb-4">
            <Image
              src={record.cover_image || "/placeholder.svg"}
              alt={record.title}
              fill
              className="object-cover rounded-md"
            />
          </div>
          <div className="flex justify-between items-center">
            <div className="text-lg font-semibold">${price.toFixed(2)}</div>
            <div className="text-sm text-muted-foreground line-through">${record.price.toFixed(2)}</div>
          </div>
        </CardContent>
      </Link>
      <CardFooter>
        <Button className="w-full" onClick={handleAddToCart}>
          <ShoppingCart className="mr-2 h-4 w-4" />
          Add to Cart
        </Button>
      </CardFooter>
    </Card>
  )
}

