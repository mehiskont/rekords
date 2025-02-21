"use client"

import type React from "react"

import Link from "next/link"
import { cn } from "@/lib/utils"

interface SearchCategoriesProps {
  activeCategory: string
  query: string
  onCategoryChange?: (category: string) => void
}

const categories = [
  { id: "everything", label: "Everything" },
  { id: "releases", label: "Releases" },
  { id: "artists", label: "Artists" },
  { id: "labels", label: "Labels" },
]

export function SearchCategories({ activeCategory, query, onCategoryChange }: SearchCategoriesProps) {
  const handleClick = (categoryId: string, e: React.MouseEvent) => {
    if (onCategoryChange) {
      e.preventDefault()
      onCategoryChange(categoryId)
    }
  }

  return (
    <div className="flex gap-2 justify-center">
      {categories.map((category) => {
        const isActive = activeCategory === category.id
        const href = `/search?q=${encodeURIComponent(query)}&category=${category.id}`

        return onCategoryChange ? (
          <button
            key={category.id}
            onClick={(e) => handleClick(category.id, e)}
            className={cn(
              "px-3 py-1 text-sm transition-colors hover:text-foreground",
              isActive ? "text-primary font-medium" : "text-muted-foreground",
            )}
          >
            {category.label}
          </button>
        ) : (
          <Link
            key={category.id}
            href={href}
            className={cn(
              "px-3 py-1 text-sm transition-colors hover:text-foreground",
              isActive ? "text-primary font-medium" : "text-muted-foreground",
            )}
          >
            {category.label}
          </Link>
        )
      })}
    </div>
  )
}

