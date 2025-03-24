"use client"

import { useEffect, useState } from "react"
import RecordGridClient from "./client-components/record-grid-client"
import { RecordFilter } from "@/components/record-filter"
import { ApiUnavailable } from "@/components/api-unavailable"
import { RecordGridSkeleton } from "@/components/record-grid-skeleton"

interface RecordGridWrapperProps {
  searchParams?: { [key: string]: string | string[] | undefined }
  showFilter?: boolean
  viewMode?: 'grid' | 'list'
}

export default function RecordGridWrapper({ 
  searchParams = {}, 
  showFilter = false,
  viewMode = 'grid'
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
        const view = typeof searchParams.view === "string" ? searchParams.view as 'grid' | 'list' : 'grid'
        
        // Create query string
        const params = new URLSearchParams()
        if (search) params.set("q", search)
        if (category) params.set("category", category)
        if (genre) params.set("genre", genre)
        if (sort) params.set("sort", sort)
        params.set("page", page.toString())
        
        // Always force refresh for search queries
        params.set("refresh", "true")
        
        // Update timestamp to ensure we break through browser cache
        params.set("_ts", Date.now().toString())
        
        console.log("Fetching records with params:", params.toString())
        
        const response = await fetch(`/api/records?${params.toString()}`, {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
          }
        })
        
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
      
      <RecordGridClient records={records} viewMode={viewMode} />
      
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