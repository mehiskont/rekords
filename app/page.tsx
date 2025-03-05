import { Suspense } from "react"
import { SearchBar } from "@/components/search-bar"
import { NewArrivals } from "@/components/new-arrivals"
import { RecordGrid } from "@/components/record-grid"
import { RecordGridSkeleton } from "@/components/record-grid-skeleton"
import { RefreshButton } from "@/components/refresh-button"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import Link from "next/link"

// Force dynamic rendering to prevent stale data from being cached
export const dynamic = 'force-dynamic'
export const revalidate = 0 // Do not cache this page

export default function HomePage() {
  return (
    <div className="min-h-screen">
   
      {/* Hero Section with Search */}
      <section className="relative py-16 bg-gradient-to-b from-background to-muted">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/50">
              Plastik Records
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              Explore our vinyl collection
            </p>
          </div>
          <SearchBar />
        </div>
      </section>

      {/* New Arrivals Section */}
      <section className="py-16">
        <div className="container max-w-6xl mx-auto px-4">        
          <Suspense fallback={<RecordGridSkeleton />}>
            <NewArrivals />
          </Suspense>
        </div>
      </section>

      {/* All Records Section */}
      <section className="py-16 bg-muted/50">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold flex items-center gap-2">
              All Records
            </h2>
            <RefreshButton />
          </div>
          <Suspense fallback={<RecordGridSkeleton />}>
            <RecordGrid />
          </Suspense>
        </div>
      </section>
    </div>
  )
}

