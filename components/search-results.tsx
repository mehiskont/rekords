import Link from "next/link"
import Image from "next/image"
import { Loader2 } from "lucide-react"
import type { DiscogsRecord } from "@/types/discogs"

interface SearchResultsProps {
  results: DiscogsRecord[]
  isLoading: boolean
  query: string
  category: string
  onClose: () => void
}

export function SearchResults({ results, isLoading, query, category, onClose }: SearchResultsProps) {
  if (!query) return null

  // Take only the first 5 results for the dropdown
  const displayResults = results.slice(0, 5)

  return (
    <div className="absolute top-full left-0 right-0 z-50 mt-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border rounded-lg shadow-lg overflow-hidden">
      {isLoading ? (
        <div className="p-4 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
        </div>
      ) : displayResults.length > 0 ? (
        <>
          <div className="max-h-[400px] overflow-y-auto">
            {displayResults.map((record) => {
              const labelDisplay = record.label
                ? record.label + (record.catalogNumber ? ` [${record.catalogNumber}]` : "")
                : "Unknown Label"
              return (
                <Link
                  key={record.id}
                  href={`/records/${record.id}`}
                  className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
                  onClick={onClose}
                >
                  <div className="relative w-12 h-12 flex-shrink-0">
                    <Image
                      src={record.cover_image || "/placeholder.svg"}
                      alt={record.title}
                      fill
                      className="object-cover rounded"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-base truncate">{record.title}</h3>
                    <p className="text-sm text-muted-foreground truncate">{record.artist}</p>
                    <p className="text-xs text-muted-foreground truncate">{labelDisplay}</p>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">${(record.price || 0).toFixed(2)}</div>
                    <div className="text-sm text-muted-foreground">{record.condition || "Unknown"}</div>
                  </div>
                </Link>
              )
            })}
          </div>
          {results.length > 5 && (
            <div className="p-4 border-t">
              <Link
                href={`/search?q=${encodeURIComponent(query)}&category=${category}`}
                className="block w-full text-center text-sm text-muted-foreground hover:text-foreground"
                onClick={onClose}
              >
                View all {results.length} results
              </Link>
            </div>
          )}
        </>
      ) : (
        <div className="p-4 text-center text-muted-foreground">No results found</div>
      )}
    </div>
  )
}

