import { Suspense } from "react"
import { SearchBar } from "@/components/search-bar"
import { RecordGrid } from "@/components/record-grid"
import { RecordGridSkeleton } from "@/components/record-grid-skeleton"

interface SearchPageProps {
  searchParams: { [key: string]: string | string[] | undefined }
}

export default function SearchPage({ searchParams }: SearchPageProps) {
  const query = typeof searchParams.q === "string" ? searchParams.q : ""
  const category = typeof searchParams.category === "string" ? searchParams.category : "everything"

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

