import { getDiscogsInventory } from "@/lib/discogs"
import { RecordCard } from "@/components/record-card"

export async function NewArrivals() {
  const { records } = await getDiscogsInventory(undefined, "date_desc", 1, 4)

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
}

