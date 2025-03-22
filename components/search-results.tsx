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
  isCompact?: boolean
}

export function SearchResults({ results, isLoading, query, category, onClose, isCompact = false }: SearchResultsProps) {
  if (!query) return null

  // Take only the first 5 results for the dropdown
  const displayResults = results.slice(0, 5)

  return (
    <div className={`absolute top-full left-0 right-0 z-50 mt-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border rounded-lg shadow-lg overflow-hidden ${isCompact ? "w-80 sm:w-96" : ""}`}>
      {isLoading ? (
        <div className="p-4 text-center">
          <Loader2 className={isCompact ? "h-5 w-5 animate-spin mx-auto" : "h-6 w-6 animate-spin mx-auto"} />
        </div>
      ) : displayResults.length > 0 ? (
        <>
          <div className={isCompact ? "max-h-[300px] overflow-y-auto" : "max-h-[400px] overflow-y-auto"}>
            {displayResults.map((record) => {
              const labelDisplay = record.label
                ? record.label + (record.catalogNumber ? ` [${record.catalogNumber}]` : "")
                : "Unknown Label"
              return (
                <Link
                  key={record.id}
                  href={`/records/${record.id}`}
                  className={`flex items-center hover:bg-muted/50 transition-colors ${isCompact ? "gap-3 p-3" : "gap-4 p-4"}`}
                  onClick={onClose}
                >
                  <div className={`relative flex-shrink-0 ${isCompact ? "w-10 h-10" : "w-12 h-12"}`}>
                    <Image
                      src={record.cover_image || "/placeholder.svg"}
                      alt={record.title}
                      fill
                      className="object-cover rounded"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-medium truncate ${isCompact ? "text-sm" : "text-base"}`}>{record.title}</h3>
                    <p className={`text-muted-foreground truncate ${isCompact ? "text-xs" : "text-sm"}`}>{record.artist}</p>
                    {!isCompact && (
                      <p className="text-xs text-muted-foreground truncate">{labelDisplay}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className={`font-medium ${isCompact ? "text-sm" : ""}`}>${(record.price || 0).toFixed(2)}</div>
                    <div className={`text-muted-foreground ${isCompact ? "text-xs" : "text-sm"}`}>{record.condition || "Unknown"}</div>
                  </div>
                </Link>
              )
            })}
          </div>
          {results.length > 5 && (
            <div className={isCompact ? "p-3 border-t" : "p-4 border-t"}>
              <Link
                href={`/search?q=${encodeURIComponent(query)}&category=${category}`}
                className={`block w-full text-center text-muted-foreground hover:text-foreground ${isCompact ? "text-xs" : "text-sm"}`}
                onClick={onClose}
              >
                View all {results.length} results
              </Link>
            </div>
          )}
        </>
      ) : (
        <div className={isCompact ? "p-3 text-center text-muted-foreground text-xs" : "p-4 text-center text-muted-foreground"}>No results found</div>
      )}
    </div>
  )
}

