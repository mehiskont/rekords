"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { RefreshButton } from "@/components/refresh-button"
import { RecordGridSkeleton } from "@/components/record-grid-skeleton"
import RecordGridClient from "./record-grid-client"
import { RecordFilter } from "@/components/record-filter"
import { ApiUnavailable } from "@/components/api-unavailable"
import { ViewToggle } from "@/components/view-toggle"

export function AllRecordsSection() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [records, setRecords] = useState([])
  const [totalRecords, setTotalRecords] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [currentPage, setCurrentPage] = useState(1)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  // Get the current search parameters
  const search = searchParams.get("q") || ""
  const category = searchParams.get("category") || "everything"
  const genre = searchParams.get("genre") || ""
  const sort = searchParams.get("sort") || "date-desc"
  const page = parseInt(searchParams.get("page") || "1")
  const view = searchParams.get("view") as 'grid' | 'list' || 'grid'
  
  useEffect(() => {
    async function fetchRecords() {
      setIsLoading(true)
      setError(null)
      
      try {
        // Create query string from current URL parameters
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
  }, [search, category, genre, sort, page])

  // Set view mode from URL when page loads
  useEffect(() => {
    if (view === 'list' || view === 'grid') {
      setViewMode(view)
    }
  }, [view])

  // Function to refresh the records with a new cache buster
  const refreshRecords = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("refresh", Date.now().toString())
    router.push(`${pathname}?${params.toString()}`)
  }

  // Function to update the view mode
  const handleViewModeChange = (newViewMode: string) => {
    if (newViewMode === 'grid' || newViewMode === 'list') {
      setViewMode(newViewMode as 'grid' | 'list')
      
      // Update URL to persist the view preference
      const params = new URLSearchParams(searchParams.toString())
      params.set("view", newViewMode)
      router.push(`${pathname}?${params.toString()}`, { scroll: false })
    }
  }

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold flex items-center gap-2">
            All Records
          </h2>
          <div className="flex items-center gap-4">
            <ViewToggle viewMode={viewMode} onViewModeChange={handleViewModeChange} />
            <RefreshButton onClick={refreshRecords} />
          </div>
        </div>
        
        {isLoading ? (
          <RecordGridSkeleton />
        ) : error ? (
          <ApiUnavailable />
        ) : (
          <div className="space-y-6">
            <RecordFilter
              totalRecords={totalRecords}
              currentPage={currentPage}
              totalPages={totalPages}
            />
            
            <RecordGridClient records={records} viewMode={viewMode} />
            
            {totalPages > 1 && (
              <div className="mt-8">
                <RecordFilter
                  totalRecords={totalRecords}
                  currentPage={currentPage}
                  totalPages={totalPages}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}