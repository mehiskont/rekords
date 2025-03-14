"use client"

import { useCart } from "@/contexts/cart-context"
import { RecordCard } from "./record-card"
import type { DiscogsRecord } from "@/types/discogs"

interface ClientRecordCardProps {
  record: DiscogsRecord
}

export function ClientRecordCard({ record }: ClientRecordCardProps) {
  try {
    const { state, dispatch } = useCart()
    
    return (
      <RecordCard 
        record={record} 
        cartState={state} 
        cartDispatch={dispatch} 
      />
    )
  } catch (error) {
    console.error("Error in ClientRecordCard:", error)
    
    // Provide fallback props when cart context is unavailable
    return (
      <RecordCard 
        record={record}
        cartState={{ items: [], isOpen: false }}
        cartDispatch={() => {}} // No-op function
      />
    )
  }
}