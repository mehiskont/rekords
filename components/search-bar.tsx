"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Search, X } from "lucide-react"
import { useDebounce } from "@/hooks/use-debounce"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SearchResults } from "@/components/search-results"
import type { DiscogsRecord } from "@/types/discogs"

const categories = [
  { id: "everything", label: "Everything" },
  { id: "releases", label: "Releases" },
  { id: "artists", label: "Artists" },
  { id: "labels", label: "Labels" },
]

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

  useEffect(() => {
    const fetchResults = async () => {
      if (!debouncedQuery) {
        setResults([])
        return
      }

      setIsLoading(true)
      try {
        const params = new URLSearchParams({
          q: debouncedQuery,
          category,
          per_page: "5",
        })

        const response = await fetch(`/api/search?${params}`)
        if (!response.ok) throw new Error("Failed to fetch results")

        const data = await response.json()
        setResults(data.records)
      } catch (error) {
        console.error("Search error:", error)
        setResults([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchResults()
  }, [debouncedQuery, category])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query) return

    setShowResults(false)
    router.push(`/search?q=${encodeURIComponent(query)}&category=${category}`)
  }

  return (
    <div ref={searchRef} className="relative w-full max-w-3xl mx-auto">
      <div className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 rounded-lg shadow-lg p-4">
        <form onSubmit={handleSubmit} className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search records..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setShowResults(true)
            }}
            className="pl-10 pr-10 bg-background"
          />
          {query && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
              onClick={() => {
                setQuery("")
                setResults([])
              }}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Clear search</span>
            </Button>
          )}
        </form>
        <nav className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <Button
              key={cat.id}
              type="button"
              variant={cat.id === category ? "default" : "ghost"}
              size="sm"
              onClick={() => setCategory(cat.id)}
              className="transition-colors"
            >
              {cat.label}
            </Button>
          ))}
        </nav>
      </div>
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

