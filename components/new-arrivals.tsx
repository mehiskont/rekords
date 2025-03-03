import { getDiscogsInventory } from "@/lib/discogs"
import { serializeForClient } from "@/lib/utils"
import { ClientRecordCard } from "@/components/client-record-card"
import { ApiUnavailable } from "@/components/api-unavailable"

export async function NewArrivals() {
  try {
    // Request more records than needed to account for potentially unavailable items
    // Adding cacheBuster to ensure we get fresh data - important for availability status
    const { records } = await getDiscogsInventory(undefined, undefined, 1, 20, {
      sort: "listed",
      sort_order: "desc",
      fetchFullReleaseData: true,
      cacheBuster: Date.now().toString() // Force a fresh request to ensure accurate availability
    })

    if (!records || records.length === 0) {
      return <p className="text-center text-lg">No new arrivals at the moment. Check back soon!</p>
    }

    // Stricter filtering for availability
    const availableRecords = records.filter(record => 
      record.quantity_available > 0 && 
      record.status === "For Sale"
    )
    
    // Take just the first 4 available records
    const displayRecords = availableRecords.slice(0, 4)
    
    // Serialize records before passing to client component
    const serializedRecords = displayRecords.map((record) => serializeForClient(record))
    
    // If we couldn't find any available records after filtering
    if (serializedRecords.length === 0) {
      return <p className="text-center text-lg">No new arrivals at the moment. Check back soon!</p>
    }

    return (
      <section className="py-12">
        <div className="container">
          <h2 className="text-3xl font-bold mb-8">New Arrivals</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {serializedRecords.map((record) => (
              <ClientRecordCard key={record.id} record={record} />
            ))}
          </div>
        </div>
      </section>
    )
  } catch (error) {
    console.error("Error in NewArrivals:", error)
    return <ApiUnavailable />
  }
}

