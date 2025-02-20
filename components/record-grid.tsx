import { getDiscogsInventory } from "@/lib/discogs"
import { RecordCard } from "@/components/record-card"

interface RecordGridProps {
  searchParams?: { [key: string]: string | string[] | undefined }
}

export async function RecordGrid({ searchParams = {} }: RecordGridProps) {
  const search = typeof searchParams.search === "string" ? searchParams.search : undefined
  const sort = typeof searchParams.sort === "string" ? searchParams.sort : undefined
  const page = typeof searchParams.page === "string" ? Number.parseInt(searchParams.page) : 1
  const perPage = 20

  try {
    const { records } = await getDiscogsInventory(search, sort, page, perPage)

    if (records.length === 0) {
      return <p className="text-center text-lg">No records found.</p>
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {records.map((record) => (
          <RecordCard key={record.id} record={record} />
        ))}
      </div>
    )
  } catch (error) {
    console.error("Failed to fetch records:", error)
    return <p className="text-center text-lg text-red-500">Failed to load records. Please try again later.</p>
  }
}

