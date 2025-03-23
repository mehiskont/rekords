"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { RefreshButton } from "@/components/refresh-button"
import { RecordGridSkeleton } from "@/components/record-grid-skeleton"
import RecordGridClient from "./record-grid-client"
import { RecordFilter } from "@/components/record-filter"
import { ApiUnavailable } from "@/components/api-unavailable"

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

  // Get the current search parameters
  const search = searchParams.get("q") || ""
  const category = searchParams.get("category") || "everything"
  const genre = searchParams.get("genre") || ""
  const sort = searchParams.get("sort") || "date-desc"
  const page = parseInt(searchParams.get("page") || "1")
  
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

  // Function to refresh the records with a new cache buster
  const refreshRecords = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("refresh", Date.now().toString())
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <section className="py-20 bg-gradient-to-b from-background to-muted/20 dark:from-[#121317] dark:to-black/80">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold flex items-center gap-2">
            All Records
          </h2>
          <RefreshButton onClick={refreshRecords} />
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
            
            <RecordGridClient records={records} />
            
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