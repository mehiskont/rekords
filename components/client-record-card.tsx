"use client"

import { useCart } from "@/contexts/cart-context"
import { RecordCard } from "./record-card"
import type { DiscogsRecord } from "@/types/discogs"

interface ClientRecordCardProps {
  record: DiscogsRecord
}

export function ClientRecordCard({ record }: ClientRecordCardProps) {
  const { state, dispatch } = useCart()

  // Ensure that state is not undefined before passing it to RecordCard
  if (!state) {
    return null // or return a loading state
  }

  return <RecordCard record={record} cartState={state} cartDispatch={dispatch} />
}

