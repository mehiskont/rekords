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
    <section className="py-12">
      <div className="container">
        <h2 className="text-3xl font-bold mb-8">New Arrivals</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {records.map((record) => (
            <ClientRecordCard key={record.id} record={record} />
          ))}
        </div>
      </div>
    </section>
  )
}