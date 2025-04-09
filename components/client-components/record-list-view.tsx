"use client"

import type { Record } from "@/types/record"
import { ClientRecordCard } from "../client-record-card"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { ShoppingCart } from "lucide-react"
import { useCart } from "@/contexts/cart-context"
import Link from "next/link"
import Image from "next/image"
import { useEffect, useState } from "react"

interface RecordListViewProps {
  records: Record[]
}

export default function RecordListView({ records }: RecordListViewProps) {
  if (!records || records.length === 0) {
    return <p className="text-center text-lg">No records found.</p>
  }

  const { state, dispatch } = useCart()
  const [sortField, setSortField] = useState<string>('title')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [sortedRecords, setSortedRecords] = useState<Record[]>(records)

  useEffect(() => {
    // Sort records by title initially
    const initialSorted = [...records].sort((a, b) => {
      const titleA = a.title || '';
      const titleB = b.title || '';
      return titleA.localeCompare(titleB);
    });
    setSortedRecords(initialSorted);
  }, [records])

  const handleAddToCart = (record: Record) => {
    dispatch({ type: "ADD_ITEM", payload: record })
  }

  const handleSort = (field: string) => {
    // Toggle direction if sorting the same field
    const newDirection = 
      sortField === field && sortDirection === 'asc' ? 'desc' : 'asc';
    
    setSortField(field)
    setSortDirection(newDirection)
    
    // Sort the records
    const sorted = [...sortedRecords].sort((a, b) => {
      let valueA, valueB;
      
      // Handle special cases for certain fields
      if (field === 'price') {
        valueA = a.price || 0;
        valueB = b.price || 0;
      } else if (field === 'quantity') {
        valueA = a.quantity || 0;
        valueB = b.quantity || 0;
      } else {
        valueA = a[field as keyof Record] || '';
        valueB = b[field as keyof Record] || '';
      }
      
      // String comparison for text fields
      if (typeof valueA === 'string' && typeof valueB === 'string') {
        return newDirection === 'asc' 
          ? valueA.localeCompare(valueB) 
          : valueB.localeCompare(valueA);
      }
      
      // Numeric comparison
      if (typeof valueA === 'number' && typeof valueB === 'number') {
        return newDirection === 'asc' 
          ? valueA - valueB 
          : valueB - valueA;
      }
      
      // Fallback for non-numeric or mixed types (or keep original string logic if preferred)
      return 0; // Or handle other types if necessary
    });
    
    setSortedRecords(sorted);
  }

  const renderSortIndicator = (field: string) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? ' ▲' : ' ▼';
  }

  return (
    <div className="w-full overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-20"></TableHead>
            <TableHead 
              className="cursor-pointer hover:bg-muted"
              onClick={() => handleSort('title')}
            >
              Title{renderSortIndicator('title')}
            </TableHead>
            <TableHead 
              className="cursor-pointer hover:bg-muted"
              onClick={() => handleSort('artist')}
            >
              Artist{renderSortIndicator('artist')}
            </TableHead>
            <TableHead 
              className="cursor-pointer hover:bg-muted"
              onClick={() => handleSort('format')}
            >
              Format{renderSortIndicator('format')}
            </TableHead>
            <TableHead 
              className="cursor-pointer hover:bg-muted" 
              onClick={() => handleSort('label')}
            >
              Label{renderSortIndicator('label')}
            </TableHead>
            <TableHead 
              className="text-right cursor-pointer hover:bg-muted"
              onClick={() => handleSort('price')}
            >
              Price{renderSortIndicator('price')}
            </TableHead>
            <TableHead 
              className="text-center cursor-pointer hover:bg-muted"
              onClick={() => handleSort('quantity')}
            >
              Qty{renderSortIndicator('quantity')}
            </TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedRecords.map((record) => {
            const formatDisplay = Array.isArray(record.format) ? record.format.join(", ") : record.format
            const labelDisplay = record.label + (record.catalogNumber ? ` [${record.catalogNumber}]` : "")
            const cartItem = state.items?.find((item) => item.id === record.id)
            const currentQuantityInCart = cartItem?.quantity || 0
            const isMaxQuantity = currentQuantityInCart >= (record.quantity || 0)
            const isAvailable = record.status === 'FOR_SALE' && (record.quantity || 0) > 0;

            return (
              <TableRow key={record.id}>
                <TableCell className="p-2">
                  <Link href={`/records/${record.id}`}>
                    <div className="relative h-16 w-16 overflow-hidden rounded-sm bg-muted flex items-center justify-center text-xs text-muted-foreground">
                      {record.coverImage ? (
                        <Image 
                          src={record.coverImage}
                          alt={record.title || 'Record cover'}
                          fill
                          style={{ objectFit: 'cover' }}
                          sizes="64px"
                        />
                      ) : (
                        <span>No Image</span>
                      )}
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
                <TableCell className="text-center">
                  {isAvailable ? record.quantity : "0"}
                </TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAddToCart(record)}
                    disabled={!isAvailable || isMaxQuantity}
                  >
                    <ShoppingCart className="h-3 w-3 mr-1" />
                    {!isAvailable ? "Out of Stock" : "Add"}
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