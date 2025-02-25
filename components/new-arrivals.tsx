import { getDiscogsInventory } from "@/lib/discogs"
import { serializeForClient } from "@/lib/utils"
import { ClientRecordCard } from "@/components/client-record-card"
import { ApiUnavailable } from "@/components/api-unavailable"

export async function NewArrivals() {
  try {
    console.log("Fetching new arrivals...")
    // Explicitly request the newest listings first with full release data
    const { records } = await getDiscogsInventory(undefined, undefined, 1, 4, {
      sort: "listed",
      sort_order: "desc",
      fetchFullReleaseData: true,
    })

    console.log("Received new arrivals:", records) // Log the received records

    if (!records || records.length === 0) {
      return <p className="text-center text-lg">No new arrivals at the moment. Check back soon!</p>
    }

    // Serialize records before passing to client component
    const serializedRecords = records.map((record) => serializeForClient(record))
    console.log("Serialized new arrivals:", serializedRecords) // Log serialized records

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

