import { Suspense } from "react"
import { SearchBar } from "@/components/search-bar"
import { NewArrivals } from "@/components/new-arrivals"
import { RecordGrid } from "@/components/record-grid"
import { RecordGridSkeleton } from "@/components/record-grid-skeleton"
import { RefreshButton } from "@/components/refresh-button"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import Link from "next/link"
import { getDiscogsInventory } from "@/lib/discogs"

// Force dynamic rendering to prevent stale data from being cached
export const dynamic = 'force-dynamic'
export const revalidate = 0 // Do not cache this page

export default async function HomePage() {
  // Fetch all inventory data to sum up the total available quantity
  const { records } = await getDiscogsInventory(undefined, undefined, 1, 100)
  
  // Calculate the total quantity by summing all quantity_available fields
  const recordCount = records.reduce((total, record) => total + (record.quantity_available || 0), 0)
  
  return (
    <div className="min-h-screen">
   
      {/* Hero Section with Search */}
      <section className="relative py-24 bg-gradient-to-b from-background via-background to-muted/20 dark:from-background dark:via-background/95 dark:to-black/60">
        <div className="container max-w-6xl mx-auto px-4 mt-12">
          <h2 className="text-xl md:text-2xl font-medium text-center mb-8">{recordCount} records currently in our library</h2>
          <SearchBar />
        </div>
      </section>

      {/* New Arrivals Section */}
      <section className="py-20 bg-card/30 dark:bg-black/40">
        <div className="container mx-auto px-4">
          <Suspense fallback={<RecordGridSkeleton />}>
            <NewArrivals />
          </Suspense>
        </div>
      </section>

      {/* All Records Section */}
      <section className="py-20 bg-gradient-to-b from-background to-muted/20 dark:from-[#121317] dark:to-black/80">
        <div className="container mx-auto px-4">
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

