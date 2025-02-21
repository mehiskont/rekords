import { getDiscogsInventory } from "@/lib/discogs"
import { RecordCard } from "@/components/record-card"
import { ApiUnavailable } from "@/components/api-unavailable"

export async function NewArrivals() {
  try {
    // Explicitly request the newest listings first
    const { records } = await getDiscogsInventory(undefined, undefined, 1, 4, { sort: "listed", sort_order: "desc" })

    console.log("New Arrivals records:", JSON.stringify(records, null, 2))

    if (records.length === 0) {
      return <p>No new arrivals at the moment. Check back soon!</p>
    }

    return (
      <section className="py-12">
        <div className="container">
          <h2 className="text-3xl font-bold mb-8">New Arrivals</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {records.map((record) => (
              <RecordCard key={record.id} record={record} />
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

