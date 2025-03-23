"use client"

import RecordGridWrapper from "./record-grid-wrapper"

interface RecordGridProxyProps {
  searchParams?: { [key: string]: string | string[] | undefined }
  showFilter?: boolean
}

// Client component that proxies to the wrapper
export default function RecordGridProxy({ searchParams, showFilter }: RecordGridProxyProps) {
  return <RecordGridWrapper searchParams={searchParams} showFilter={showFilter} />
}