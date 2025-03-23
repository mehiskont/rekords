"use client"

import { useEffect, useState } from "react"
import type { DiscogsRecord } from "@/types/discogs"
import { ClientRecordCard } from "../client-record-card"
import RecordListView from "./record-list-view"

interface RecordGridClientProps {
  records: DiscogsRecord[]
  viewMode?: 'grid' | 'list'
}

export default function RecordGridClient({ records, viewMode = 'grid' }: RecordGridClientProps) {
  const [sortedRecords, setSortedRecords] = useState<DiscogsRecord[]>(records)

  useEffect(() => {
    // Sort records by title initially
    const initialSorted = [...records].sort((a, b) => {
      const titleA = a.title || '';
      const titleB = b.title || '';
      return titleA.localeCompare(titleB);
    });
    setSortedRecords(initialSorted);
  }, [records]);

  if (!records || records.length === 0) {
    return <p className="text-center text-lg">No records found.</p>
  }

  if (viewMode === 'list') {
    return <RecordListView records={sortedRecords} />
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {sortedRecords.map((record) => (
        <ClientRecordCard key={record.id} record={record} />
      ))}
    </div>
  )
}