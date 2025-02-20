"use client"

import type React from "react"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const categories = [
  { id: "everything", label: "Everything" },
  { id: "releases", label: "Releases" },
  { id: "artists", label: "Artists" },
  { id: "labels", label: "Labels" },
]

export function SearchBar() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState(searchParams.get("search") || "")
  const currentCategory = searchParams.get("category") || "everything"

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams(searchParams)
    if (search) {
      params.set("search", search)
    } else {
      params.delete("search")
    }
    router.push(`/?${params.toString()}`)
  }

  const handleCategoryChange = (category: string) => {
    const params = new URLSearchParams(searchParams)
    params.set("category", category)
    router.push(`/?${params.toString()}`)
  }

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 rounded-lg shadow-lg p-4">
        <form onSubmit={handleSearch} className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search records..."
            className="pl-10 bg-background"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </form>
        <nav className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <Button
              key={category.id}
              variant={category.id === currentCategory ? "default" : "ghost"}
              size="sm"
              onClick={() => handleCategoryChange(category.id)}
              className={cn(
                "transition-colors",
                category.id === currentCategory && "bg-primary text-primary-foreground",
              )}
            >
              {category.label}
            </Button>
          ))}
        </nav>
      </div>
    </div>
  )
}

