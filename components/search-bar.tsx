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

export function SearchBar({ initialQuery = "", initialCategory = "everything" }: SearchBarProps) {
  const router = useRouter()
  const [query, setQuery] = useState(initialQuery)
  const [category, setCategory] = useState(initialCategory)
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<DiscogsRecord[]>([])
  const [showResults, setShowResults] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const debouncedQuery = useDebounce(query, 300)

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
    if (query) {
      router.push(`/search?q=${encodeURIComponent(query)}&category=${newCategory}`)
    }
  }

  return (
    <div ref={searchRef} className="relative w-full max-w-3xl mx-auto space-y-4">
      <div className="bg-card shadow-xl rounded-xl overflow-hidden border border-primary/20 dark:bg-black/40 dark:border-white/10">
        <form onSubmit={handleSubmit} className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary dark:text-primary" />
          <Input
            type="search"
            placeholder="Search records..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setShowResults(true)
            }}
            className="pl-12 py-6 h-14 bg-transparent border-0 text-lg focus-visible:ring-0 focus-visible:ring-offset-0"
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

