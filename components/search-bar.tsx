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

interface SearchBarProps {
  initialQuery?: string
  initialCategory?: string
}

const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export function SearchBar({ initialQuery = "", initialCategory = "everything" }: SearchBarProps) {
  const router = useRouter()
  const [query, setQuery] = useState(initialQuery)
  const [category, setCategory] = useState(initialCategory)
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<DiscogsRecord[]>([])
  const [showResults, setShowResults] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const debouncedQuery = useDebounce(query, 300)
  const cacheRef = useRef<{ [key: string]: { data: DiscogsRecord[]; timestamp: number } }>({})

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const fetchResults = useCallback(async () => {
    if (!debouncedQuery) {
      setResults([])
      return
    }

    const cacheKey = `${debouncedQuery}:${category}`
    const cachedResult = cacheRef.current[cacheKey]

    if (cachedResult && Date.now() - cachedResult.timestamp < CACHE_DURATION) {
      setResults(cachedResult.data)
      return
    }

    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        q: debouncedQuery,
        category,
        per_page: "20",
      })

      const response = await fetch(`/api/search?${params}`)
      if (!response.ok) throw new Error("Failed to fetch results")

      const data = await response.json()
      setResults(data.records)

      // Update cache
      cacheRef.current[cacheKey] = { data: data.records, timestamp: Date.now() }
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
    if (query) {
      router.push(`/search?q=${encodeURIComponent(query)}&category=${newCategory}`)
    }
  }

  return (
    <div ref={searchRef} className="relative w-full max-w-3xl mx-auto space-y-4">
      <div className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 rounded-lg shadow-lg p-4">
        <form onSubmit={handleSubmit} className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search records..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setShowResults(true)
            }}
            className="pl-10 bg-background"
          />
        </form>
      </div>
      <SearchCategories activeCategory={category} query={query} onCategoryChange={handleCategoryChange} />
      {showResults && (
        <SearchResults
          results={results}
          isLoading={isLoading}
          query={query}
          category={category}
          onClose={() => setShowResults(false)}
        />
      )}
    </div>
  )
}

