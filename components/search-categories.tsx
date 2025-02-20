"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"

interface SearchCategoriesProps {
  activeCategory: string
  query: string
}

const categories = [
  { id: "everything", label: "Everything" },
  { id: "releases", label: "Releases" },
  { id: "artists", label: "Artists" },
  { id: "labels", label: "Labels" },
]

export function SearchCategories({ activeCategory, query }: SearchCategoriesProps) {
  return (
    <div className="flex gap-2">
      {categories.map((category) => (
        <Link
          key={category.id}
          href={`/search?q=${encodeURIComponent(query)}&category=${category.id}`}
          className={cn(
            "px-4 py-2 rounded-full text-sm font-medium transition-colors",
            activeCategory === category.id
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {category.label}
        </Link>
      ))}
    </div>
  )
}

