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
      // Don't navigate to search page when in dropdown
    }
  }

  return (
    <div className={cn(
      "flex gap-1 md:gap-2 justify-center flex-wrap", 
      isCompact ? "px-1" : "md:gap-4"
    )}>
      {categories.map((category) => {
        const isActive = activeCategory === category.id
        const href = `/search?q=${encodeURIComponent(query)}&category=${category.id}`

        return onCategoryChange ? (
          <button
            key={category.id}
            onClick={(e) => handleClick(category.id, e)}
            className={cn(
              "rounded-full transition-colors hover:bg-muted dark:hover:bg-white/10",
              isCompact ? 
                "px-1.5 py-0.5 text-[10px] sm:px-2 sm:py-1 sm:text-xs" : 
                "px-3 py-1 text-xs sm:px-4 sm:py-2 sm:text-sm",
              isActive 
                ? "bg-primary/10 text-primary font-medium dark:bg-primary/20" 
                : "text-muted-foreground/70 hover:text-foreground dark:text-white/50 dark:hover:text-white/80",
            )}
          >
            {category.label}
          </button>
        ) : (
          <Link
            key={category.id}
            href={href}
            className={cn(
              "rounded-full transition-colors hover:bg-muted dark:hover:bg-white/10",
              isCompact ? 
                "px-1.5 py-0.5 text-[10px] sm:px-2 sm:py-1 sm:text-xs" : 
                "px-3 py-1 text-xs sm:px-4 sm:py-2 sm:text-sm",
              isActive 
                ? "bg-primary/10 text-primary font-medium dark:bg-primary/20" 
                : "text-muted-foreground/70 hover:text-foreground dark:text-white/50 dark:hover:text-white/80",
            )}
          >
            {category.label}
          </Link>
        )
      })}
    </div>
  )
}

