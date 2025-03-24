"use client"

import Image from "next/image"
import { Button } from "@/components/ui/button"
import { ShoppingCart } from "lucide-react"
import { useCart } from "@/contexts/cart-context"
import { calculatePriceWithoutFees } from "@/lib/price-calculator"
import { toast } from "@/components/ui/use-toast"
import type { DiscogsRecord } from "@/types/discogs"
import { TrackListing } from "@/components/track-listing"

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
  
  // Calculate if there are any tracks or videos available
  const hasTracksOrVideos = Boolean(
    (record.tracks && record.tracks.length > 0) || 
    (record.videos && record.videos.length > 0)
  )

  return (
    <>
      <div className="flex flex-col md:flex-row gap-6 mb-8">
        {/* Image column */}
        <div className="md:w-2/5 lg:w-1/3">
          {/* Image */}
          <div className="relative aspect-square">
            <Image
              src={record.cover_image || "/placeholder.svg"}
              alt={record.title}
              fill
              className="object-contain rounded-md shadow-sm"
              sizes="(max-width: 768px) 100vw, 40vw"
              quality={90}
              priority
              loading="eager"
            />
          </div>
        </div>
        
        {/* Content column - now with tracklist */}
        <div className="flex-1 flex flex-col">
          {/* Record details section */}
          <div className="flex flex-col mb-6">
            {/* Title, artist, price section */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
              <div>
                <h1 className="text-2xl font-bold">{record.title}</h1>
                <p className="text-lg">{record.artist}</p>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-xl font-bold">${(record.price || 0).toFixed(2)}</p>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleAddToCart}
                  disabled={isMaxQuantity || record.quantity_available === 0}
                  className="whitespace-nowrap"
                >
                  <ShoppingCart className="mr-1 h-4 w-4" />
                  {record.quantity_available === 0
                    ? "Out of Stock"
                    : isMaxQuantity
                      ? `Max (${record.quantity_available})`
                      : "Add to Cart"}
                </Button>
              </div>
            </div>

            {/* All details in one grid - Format, Released, Stock now at the top */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm mt-4">
              <div className="flex gap-2">
                <span className="font-medium">Format:</span>
                <span>{formatDisplay}</span>
              </div>
              {record.released && (
                <div className="flex gap-2">
                  <span className="font-medium">Released:</span>
                  <span>{record.released}</span>
                </div>
              )}
              {record.quantity_available > 0 && (
                <div className="flex gap-2 text-muted-foreground">
                  <span className="font-medium">Stock:</span>
                  <span>{record.quantity_available} unit{record.quantity_available > 1 ? "s" : ""}</span>
                </div>
              )}
              <div className="flex gap-2">
                <span className="font-medium">Condition:</span>
                <span>{record.condition}</span>
              </div>
              <div className="flex gap-2">
                <span className="font-medium">Label:</span>
                <span className="truncate">{labelDisplay}</span>
              </div>
              {record.country && (
                <div className="flex gap-2">
                  <span className="font-medium">Country:</span>
                  <span>{record.country}</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Styles as badges */}
          {record.styles && record.styles.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-4">
              {record.styles.map((style, index) => (
                <span key={index} className="px-2 py-0.5 bg-secondary text-secondary-foreground rounded-full text-xs">
                  {style}
                </span>
              ))}
            </div>
          )}
          
          {/* Track listing moved here */}
          {hasTracksOrVideos && (
            <div>
              <TrackListing tracks={record.tracks || []} videos={record.videos || []} />
            </div>
          )}
          
          {/* No-tracks message */}
          {!hasTracksOrVideos && (
            <div className="mt-2 p-3 border border-dashed rounded-md text-center bg-secondary/10">
              <p className="text-sm text-muted-foreground">No audio previews available for this release</p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

