"use client"

import type React from "react"

import Link from "next/link"
import { cn } from "@/lib/utils"

interface SearchCategoriesProps {
  activeCategory: string
  query: string
  onCategoryChange?: (category: string) => void
  isCompact?: boolean
}

const categories = [
  { id: "everything", label: "Everything" },
  { id: "releases", label: "Releases" },
  { id: "artists", label: "Artists" },
  { id: "labels", label: "Labels" },
]

export function SearchCategories({ activeCategory, query, onCategoryChange, isCompact = false }: SearchCategoriesProps) {
  const handleClick = (categoryId: string, e: React.MouseEvent) => {
    if (onCategoryChange) {
      e.preventDefault()
      onCategoryChange(categoryId)
    }
  }

  return (
    <div className={cn(
      "flex gap-2 justify-center", 
      isCompact ? "flex-wrap" : "gap-4"
    )}>
      {categories.map((category) => {
        const isActive = activeCategory === category.id
        const href = `/search?q=${encodeURIComponent(query)}&category=${category.id}`

        return onCategoryChange ? (
          <button
            key={category.id}
            onClick={(e) => handleClick(category.id, e)}
            className={cn(
              "text-sm rounded-full transition-colors hover:bg-muted dark:hover:bg-white/10",
              isCompact ? "px-3 py-1 text-xs" : "px-4 py-2 text-sm",
              isActive 
                ? "bg-primary/10 text-primary font-medium dark:bg-primary/20" 
                : "text-muted-foreground hover:text-foreground dark:text-white/70 dark:hover:text-white",
            )}
          >
            {category.label}
          </button>
        ) : (
          <Link
            key={category.id}
            href={href}
            className={cn(
              "text-sm rounded-full transition-colors hover:bg-muted dark:hover:bg-white/10",
              isCompact ? "px-3 py-1 text-xs" : "px-4 py-2 text-sm",
              isActive 
                ? "bg-primary/10 text-primary font-medium dark:bg-primary/20" 
                : "text-muted-foreground hover:text-foreground dark:text-white/70 dark:hover:text-white",
            )}
          >
            {category.label}
          </Link>
        )
      })}
    </div>
  )
}

