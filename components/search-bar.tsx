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
    <div className="w-full max-w-4xl mx-auto space-y-4">
      <form onSubmit={handleSearch} className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search records..."
          className="pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </form>
      <nav className="flex border-b">
        {categories.map((category) => (
          <Button
            key={category.id}
            variant="ghost"
            className={cn(
              "relative h-9 rounded-none border-b-2 border-transparent px-4",
              category.id === currentCategory && "border-primary",
            )}
            onClick={() => handleCategoryChange(category.id)}
          >
            {category.label}
          </Button>
        ))}
      </nav>
    </div>
  )
}

