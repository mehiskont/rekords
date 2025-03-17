"use client"

import { useEffect, useState } from "react"
import { useCart } from "@/contexts/cart-context"
import { RecordCard } from "./record-card"
import type { DiscogsRecord } from "@/types/discogs"
import { SessionProvider } from "next-auth/react"
import { CartProvider } from "@/contexts/cart-context"

interface ClientRecordCardProps {
  record: DiscogsRecord
}

export function ClientRecordCard({ record }: ClientRecordCardProps) {
  const [isMounted, setIsMounted] = useState(false)
  
  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return <RecordCard record={record} cartState={{ items: [], isOpen: false }} cartDispatch={() => {}} />
  }

  const { state, dispatch } = useCart()
  
  return (
    <RecordCard 
      record={record} 
      cartState={state} 
      cartDispatch={dispatch}
    />
  )
}

