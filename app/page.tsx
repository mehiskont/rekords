import { Suspense } from "react"
import { SearchBar } from "@/components/search-bar"
import { NewArrivals } from "@/components/new-arrivals"
import { RecordGrid } from "@/components/record-grid"
import { RecordGridSkeleton } from "@/components/record-grid-skeleton"

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section with Search */}
      <section className="relative py-20 bg-gradient-to-b from-background to-muted">
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
          <h2 className="text-3xl font-bold mb-8 flex items-center gap-2">
            All Records
          </h2>
          <Suspense fallback={<RecordGridSkeleton />}>
            <RecordGrid />
          </Suspense>
        </div>
      </section>
    </div>
  )
}

