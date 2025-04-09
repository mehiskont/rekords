"use client"

import { useEffect, useState } from "react"
import { useCart, type CartState, type CartAction } from "@/contexts/cart-context"
import { RecordCard } from "./record-card"
// Remove import type { DiscogsRecord } from "@/types/discogs" // Should use placeholder type
// Assuming placeholder Record type is defined globally or imported
type Record = {
  id: number | string;
  title: string;
  artist?: string;
  cover_image?: string;
  label?: string;
  catalogNumber?: string;
  price?: number;
  condition?: string;
  quantity_available?: number;
};

interface ClientRecordCardProps {
  // record: DiscogsRecord // Use placeholder type
  record: Record
}

// Define a dummy initial state that matches CartState structure
const initialDummyCartState: CartState = {
  items: [],
  isOpen: false,
  isLoading: false,
};

export function ClientRecordCard({ record }: ClientRecordCardProps) {
  const [isMounted, setIsMounted] = useState(false)
  // Call useCart unconditionally at the top level
  const { state, dispatch } = useCart()
  
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Determine which props to pass based on mount state
  const cardProps = isMounted 
    ? { cartState: state, cartDispatch: dispatch } 
    : { cartState: initialDummyCartState, cartDispatch: () => {} }; // Use the full dummy state

  // Always render RecordCard, but pass different props
  return (
    <RecordCard 
      record={record} 
      {...cardProps} // Spread the determined props
    />
  )
}

