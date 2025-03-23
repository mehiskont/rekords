"use client"

import type { DiscogsRecord } from "@/types/discogs"
import { ClientRecordCard } from "../client-record-card"

interface RecordGridClientProps {
  records: DiscogsRecord[]
}

export default function RecordGridClient({ records }: RecordGridClientProps) {
  if (!records || records.length === 0) {
    return <p className="text-center text-lg">No records found.</p>
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {records.map((record) => (
        <ClientRecordCard key={record.id} record={record} />
      ))}
    </div>
  )
}