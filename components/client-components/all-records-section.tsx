"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { RefreshButton } from "@/components/refresh-button"
import { RecordGridSkeleton } from "@/components/record-grid-skeleton"
import RecordGridClient from "./record-grid-client"
import { ApiUnavailable } from "@/components/api-unavailable"
import { ViewToggle } from "@/components/view-toggle"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp } from "lucide-react"

// Define our sortable columns
type SortableColumn = {
  key: string
  label: string
}

// List of columns that can be sorted
const sortableColumns: SortableColumn[] = [
  { key: "title", label: "Title" },
  { key: "artist", label: "Artist" },
  { key: "price", label: "Price" },
  { key: "date", label: "Date Added" }
]

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
  
  // Parse the current sort value to get field and direction
  const [sortField, sortDirection] = sort.split("-");
  
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

  // Function to handle sorting
  const handleSort = (columnKey: string) => {
    const params = new URLSearchParams(searchParams.toString())
    
    // If already sorting by this column, toggle direction
    if (sortField === columnKey) {
      params.set("sort", `${columnKey}-${sortDirection === "asc" ? "desc" : "asc"}`)
    } else {
      // Default to ascending for new column
      params.set("sort", `${columnKey}-asc`)
    }
    
    // Reset to first page when sorting changes
    params.set("page", "1")
    
    router.push(`${pathname}?${params.toString()}`)
  }

  // Function to render sort indicator
  const renderSortIndicator = (columnKey: string) => {
    if (sortField !== columnKey) {
      return null;
    }
    
    return sortDirection === "asc" ? (
      <ChevronUp className="ml-1 h-4 w-4" />
    ) : (
      <ChevronDown className="ml-1 h-4 w-4" />
    );
  }

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold">
            All Records
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {totalRecords} results
            </span>
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
            <RecordGridClient records={records} viewMode={viewMode} />
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex justify-center">
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    disabled={currentPage === 1}
                    onClick={() => {
                      const params = new URLSearchParams(searchParams.toString())
                      params.set("page", String(currentPage - 1))
                      router.push(`${pathname}?${params.toString()}`)
                    }}
                  >
                    Previous
                  </Button>
                  
                  <div className="flex items-center px-4">
                    <span className="text-sm">
                      Page {currentPage} of {totalPages}
                    </span>
                  </div>
                  
                  <Button
                    variant="outline"
                    disabled={currentPage === totalPages}
                    onClick={() => {
                      const params = new URLSearchParams(searchParams.toString())
                      params.set("page", String(currentPage + 1))
                      router.push(`${pathname}?${params.toString()}`)
                    }}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}