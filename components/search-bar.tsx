"use client"

import type React from "react"
import { useEffect, useRef, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Search } from "lucide-react"
import { useDebounce } from "@/hooks/use-debounce"
import { Input } from "@/components/ui/input"
import { SearchResults } from "@/components/search-results"
import { SearchCategories } from "@/components/search-categories"
import type { DiscogsRecord } from "@/types/discogs"
import { cn } from "@/lib/utils"

interface SearchBarProps {
  initialQuery?: string
  initialCategory?: string
  isCompact?: boolean // Add compact mode for navbar
  expandable?: boolean // Add expandable mode for navbar searchbar
}

export function SearchBar({ initialQuery = "", initialCategory = "everything", isCompact = false, expandable = false }: SearchBarProps) {
  const router = useRouter()
  const [query, setQuery] = useState(initialQuery)
  const [category, setCategory] = useState(initialCategory)
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<DiscogsRecord[]>([])
  const [showResults, setShowResults] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const debouncedQuery = useDebounce(query, 300)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false)
        setIsFocused(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const fetchResults = useCallback(async () => {
    // Don't fetch if query is empty or too short
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setResults([])
      return
    }

    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        q: debouncedQuery,
        category,
        per_page: "20",
      })

      console.log("Fetching search results:", `/api/search?${params.toString()}`)
      const response = await fetch(`/api/search?${params.toString()}`)

      if (!response.ok) {
        throw new Error("Failed to fetch results")
      }

      const data = await response.json()
      console.log("Search results:", data)

      if (data.error) {
        throw new Error(data.error)
      }

      setResults(data.records)
    } catch (error) {
      console.error("Search error:", error)
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }, [debouncedQuery, category])

  useEffect(() => {
    fetchResults()
  }, [fetchResults])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query) return

    setShowResults(false)
    router.push(`/search?q=${encodeURIComponent(query)}&category=${category}`)
  }

  const handleCategoryChange = (newCategory: string) => {
    setCategory(newCategory)
    // Only navigate to search page when not in compact/navbar mode
    if (query && !isCompact) {
      router.push(`/search?q=${encodeURIComponent(query)}&category=${newCategory}`)
    }
    // In compact mode just update the category for filtering search results in the dropdown
  }

  return (
    <div 
      ref={searchRef} 
      className={cn(
        "relative mx-auto", 
        isCompact ? "" : "w-full max-w-3xl space-y-4",
        expandable && isCompact ? "transition-all duration-300 ease-in-out" : "",
        expandable && isCompact && isFocused ? "w-64" : expandable && isCompact ? "w-40" : "w-full"
      )}
      style={{ position: isCompact ? 'relative' : 'relative' }} // Ensure consistent positioning
    >
      <div className={cn(
        "bg-card overflow-hidden border border-primary/20 dark:bg-black/40 dark:border-white/10",
        isCompact 
          ? "rounded-md shadow" 
          : "rounded-xl shadow-xl"
      )}>
        <form onSubmit={handleSubmit} className="relative">
          <Search className={cn(
            "absolute left-3 top-1/2 -translate-y-1/2 text-primary dark:text-primary",
            isCompact ? "h-4 w-4" : "h-5 w-5"
          )} />
          <Input
            type="search"
            placeholder="Search records..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setShowResults(true)
            }}
            onFocus={() => {
              setIsFocused(true)
              setShowResults(true) // Show results when focused
            }}
            className={cn(
              "bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0",
              isCompact 
                ? "pl-9 py-2 h-9 text-sm" 
                : "pl-12 py-6 h-14 text-lg"
            )}
          />
        </form>
      </div>
      
      {/* Show categories when input is focused in compact mode or always in full mode */}
      {(!isCompact || (isCompact && showResults)) && (
        <div className={cn(
          isCompact ? "bg-white dark:bg-black/40 border border-primary/10 dark:border-white/10" : "bg-transparent", 
          isCompact && showResults ? "p-3 border-t" : "",
          "rounded-b-md"
        )}>
          <SearchCategories 
            activeCategory={category} 
            query={query} 
            onCategoryChange={handleCategoryChange}
            isCompact={isCompact}
          />
        </div>
      )}
      
      {/* Only show results when there's a query and results are supposed to be shown */}
      {showResults && query.length > 0 && (
        <SearchResults
          results={results}
          isLoading={isLoading}
          query={query}
          category={category}
          onClose={() => setShowResults(false)}
          isCompact={isCompact}
        />
      )}
    </div>
  )
}

