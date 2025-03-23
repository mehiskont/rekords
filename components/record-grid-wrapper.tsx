"use client"

import { useEffect, useState } from "react"
import RecordGridClient from "./client-components/record-grid-client"
import { RecordFilter } from "@/components/record-filter"
import { ApiUnavailable } from "@/components/api-unavailable"
import { RecordGridSkeleton } from "@/components/record-grid-skeleton"

interface RecordGridWrapperProps {
  searchParams?: { [key: string]: string | string[] | undefined }
  showFilter?: boolean
}

export default function RecordGridWrapper({ 
  searchParams = {}, 
  showFilter = false 
}: RecordGridWrapperProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [records, setRecords] = useState([])
  const [totalRecords, setTotalRecords] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [currentPage, setCurrentPage] = useState(1)

  // Convert searchParams to URL parameters
  useEffect(() => {
    async function fetchRecords() {
      setIsLoading(true)
      setError(null)
      
      try {
        // Extract values from searchParams
        const search = typeof searchParams.q === "string" ? searchParams.q : ""
        const category = typeof searchParams.category === "string" ? searchParams.category : "everything"
        const genre = typeof searchParams.genre === "string" ? searchParams.genre : ""
        const sort = typeof searchParams.sort === "string" ? searchParams.sort : "date-desc"
        const page = typeof searchParams.page === "string" ? parseInt(searchParams.page) : 1
        
        // Create query string
        const params = new URLSearchParams()
        if (search) params.set("q", search)
        if (category) params.set("category", category)
        if (genre) params.set("genre", genre)
        if (sort) params.set("sort", sort)
        params.set("page", page.toString())
        
        const response = await fetch(`/api/records?${params.toString()}`)
        
        if (!response.ok) {
          throw new Error("Failed to fetch records")
        }
        
        const data = await response.json()
        
        setRecords(data.records || [])
        setTotalRecords(data.totalRecords || 0)
        setTotalPages(data.totalPages || 1)
        setCurrentPage(data.page || 1)
      } catch (err) {
        console.error("Error fetching records:", err)
        setError(err instanceof Error ? err.message : "An unknown error occurred")
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchRecords()
  }, [searchParams])

  if (isLoading) return <RecordGridSkeleton />
  if (error) return <ApiUnavailable />

  return (
    <div className="space-y-6">
      {showFilter && (
        <RecordFilter
          totalRecords={totalRecords}
          currentPage={currentPage}
          totalPages={totalPages}
        />
      )}
      
      <RecordGridClient records={records} />
      
      {showFilter && totalPages > 1 && (
        <div className="mt-8">
          <RecordFilter
            totalRecords={totalRecords}
            currentPage={currentPage}
            totalPages={totalPages}
          />
        </div>
      )}
    </div>
  )
}