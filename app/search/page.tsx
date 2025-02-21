import type { Metadata } from "next"
import { Suspense } from "react"
import { SearchBar } from "@/components/search-bar"
import { RecordGrid } from "@/components/record-grid"
import { RecordGridSkeleton } from "@/components/record-grid-skeleton"

export const metadata: Metadata = {
  title: "Search Records",
  description: "Search our collection of rare and collectible vinyl records",
}

interface SearchPageProps {
  searchParams?: {
    q?: string
    category?: string
  }
}

export default function SearchPage({ searchParams = {} }: SearchPageProps) {
  const query = searchParams.q ?? ""
  const category = searchParams.category ?? "everything"

  return (
    <div className="container max-w-6xl mx-auto px-4 py-12">
      <div className="mb-8">
        <SearchBar initialQuery={query} initialCategory={category} />
      </div>
      <div>
        <h1 className="text-2xl font-bold mb-6">
          {query ? (
            <>
              Search results for "{query}"{category !== "everything" && ` in ${category}`}
            </>
          ) : (
            "All Records"
          )}
        </h1>
        <Suspense fallback={<RecordGridSkeleton />}>
          <RecordGrid searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  )
}

