"use client"

import type { DiscogsRecord } from "@/types/discogs"
import { ClientRecordCard } from "../client-record-card"

interface NewArrivalsClientProps {
  records: DiscogsRecord[]
}

export default function NewArrivalsClient({ records }: NewArrivalsClientProps) {
  if (!records || records.length === 0) {
    return <p className="text-center text-lg">No new arrivals at the moment. Check back soon!</p>
  }

  return (
    <div>
      <h2 className="text-3xl font-bold mb-8">New Arrivals</h2>
      <div className="flex space-x-4 overflow-x-auto scrollbar-hide pb-4">
        {records.slice(0, 6).map((record) => (
          <div 
            key={record.id} 
            className="w-64 flex-shrink-0"
          >
            <ClientRecordCard record={record} />
          </div>
        ))}
      </div>
    </div>
  )
}