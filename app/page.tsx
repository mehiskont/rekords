import { Suspense } from "react"
import { SearchBar } from "@/components/search-bar"
import { NewArrivals } from "@/components/new-arrivals"
import { RecordGrid } from "@/components/record-grid"
import { RecordGridSkeleton } from "@/components/record-grid-skeleton"

export default function HomePage() {
  return (
    <div className="space-y-8">
      <section className="py-12 bg-muted/40">
        <div className="container">
          <h1 className="text-4xl font-bold text-center mb-8">Discover Rare Vinyl Records</h1>
          <SearchBar />
        </div>
      </section>

      <Suspense fallback={<RecordGridSkeleton />}>
        <NewArrivals />
      </Suspense>

      <section className="py-12">
        <div className="container">
          <h2 className="text-3xl font-bold mb-8">All Records</h2>
          <Suspense fallback={<RecordGridSkeleton />}>
            <RecordGrid />
          </Suspense>
        </div>
      </section>
    </div>
  )
}

