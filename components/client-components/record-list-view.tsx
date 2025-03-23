"use client"

import type { DiscogsRecord } from "@/types/discogs"
import { ClientRecordCard } from "../client-record-card"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { ShoppingCart } from "lucide-react"
import { useCart } from "@/contexts/cart-context"
import Link from "next/link"
import Image from "next/image"

interface RecordListViewProps {
  records: DiscogsRecord[]
}

export default function RecordListView({ records }: RecordListViewProps) {
  if (!records || records.length === 0) {
    return <p className="text-center text-lg">No records found.</p>
  }

  const { state, dispatch } = useCart()

  const handleAddToCart = (record: DiscogsRecord) => {
    dispatch({ type: "ADD_ITEM", payload: record })
  }

  return (
    <div className="w-full overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-20"></TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Artist</TableHead>
            <TableHead>Format</TableHead>
            <TableHead>Label</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((record) => {
            const formatDisplay = Array.isArray(record.format) ? record.format.join(", ") : record.format
            const labelDisplay = record.label + (record.catalogNumber ? ` [${record.catalogNumber}]` : "")
            const cartItem = state.items?.find((item) => item.id === record.id)
            const currentQuantityInCart = cartItem?.quantity || 0
            const isMaxQuantity = currentQuantityInCart >= (record.quantity_available || 0)

            return (
              <TableRow key={record.id}>
                <TableCell className="p-2">
                  <Link href={`/records/${record.id}`}>
                    <div className="relative h-16 w-16 overflow-hidden rounded-sm">
                      <Image 
                        src={record.cover_image} 
                        alt={record.title}
                        fill
                        style={{ objectFit: 'cover' }}
                        sizes="64px"
                      />
                    </div>
                  </Link>
                </TableCell>
                <TableCell className="font-medium">
                  <Link href={`/records/${record.id}`} className="hover:underline">
                    {record.title}
                  </Link>
                </TableCell>
                <TableCell>{record.artist}</TableCell>
                <TableCell>{formatDisplay || "Unknown"}</TableCell>
                <TableCell className="max-w-[200px] truncate">{labelDisplay}</TableCell>
                <TableCell className="text-right font-medium">${(record.price || 0).toFixed(2)}</TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAddToCart(record)}
                    disabled={isMaxQuantity || (record.quantity_available || 0) === 0}
                  >
                    <ShoppingCart className="h-3 w-3 mr-1" />
                    {(record.quantity_available || 0) === 0
                      ? "Out of Stock"
                      : "Add"}
                  </Button>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}