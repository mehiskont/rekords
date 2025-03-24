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
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

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
  
  // Generate page numbers to display
  const getPageNumbers = () => {
    const pageNumbers = []
    
    if (totalPages <= 7) {
      // Show all pages if there are 7 or fewer
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i)
      }
    } else {
      // Complex logic for many pages
      if (currentPage <= 3) {
        // Near the start
        for (let i = 1; i <= 5; i++) {
          pageNumbers.push(i)
        }
        pageNumbers.push('ellipsis')
        pageNumbers.push(totalPages)
      } else if (currentPage >= totalPages - 2) {
        // Near the end
        pageNumbers.push(1)
        pageNumbers.push('ellipsis')
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pageNumbers.push(i)
        }
      } else {
        // In the middle
        pageNumbers.push(1)
        pageNumbers.push('ellipsis')
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pageNumbers.push(i)
        }
        pageNumbers.push('ellipsis')
        pageNumbers.push(totalPages)
      }
    }
    
    return pageNumbers
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
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-2">
                <div className="text-sm text-muted-foreground">
                  Showing {(currentPage - 1) * 24 + 1}-{Math.min(currentPage * 24, totalRecords)} of {totalRecords} records
                </div>
                
                <Pagination className="w-full sm:w-auto justify-center sm:justify-end">
                  <PaginationContent className="bg-card rounded-md border shadow-sm">
                    {currentPage > 1 && (
                      <PaginationItem>
                        <PaginationPrevious 
                          href="#" 
                          onClick={(e) => {
                            e.preventDefault()
                            const params = new URLSearchParams(searchParams.toString())
                            params.set("page", String(currentPage - 1))
                            router.push(`${pathname}?${params.toString()}`)
                          }}
                          className="hover:bg-accent hover:text-accent-foreground"
                        />
                      </PaginationItem>
                    )}
                    
                    {getPageNumbers().map((page, index) => (
                      <PaginationItem key={index}>
                        {page === 'ellipsis' ? (
                          <PaginationEllipsis />
                        ) : (
                          <PaginationLink 
                            href="#" 
                            isActive={page === currentPage}
                            onClick={(e) => {
                              e.preventDefault()
                              const params = new URLSearchParams(searchParams.toString())
                              params.set("page", String(page))
                              router.push(`${pathname}?${params.toString()}`)
                            }}
                            className={page === currentPage ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground" : "hover:bg-accent hover:text-accent-foreground"}
                          >
                            {page}
                          </PaginationLink>
                        )}
                      </PaginationItem>
                    ))}
                    
                    {currentPage < totalPages && (
                      <PaginationItem>
                        <PaginationNext 
                          href="#" 
                          onClick={(e) => {
                            e.preventDefault()
                            const params = new URLSearchParams(searchParams.toString())
                            params.set("page", String(currentPage + 1))
                            router.push(`${pathname}?${params.toString()}`)
                          }}
                          className="hover:bg-accent hover:text-accent-foreground"
                        />
                      </PaginationItem>
                    )}
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}