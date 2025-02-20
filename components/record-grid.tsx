import { getDiscogsInventory } from "@/lib/discogs"
import { RecordCard } from "@/components/record-card"

interface RecordGridProps {
  searchParams?: { [key: string]: string | string[] | undefined }
}

export async function RecordGrid({ searchParams = {} }: RecordGridProps) {
  const search = typeof searchParams.q === "string" ? searchParams.q : undefined
  const category = typeof searchParams.category === "string" ? searchParams.category : "everything"
  const sort = typeof searchParams.sort === "string" ? searchParams.sort : undefined
  const page = typeof searchParams.page === "string" ? Number.parseInt(searchParams.page) : 1
  const perPage = 20

  try {
    const { records } = await getDiscogsInventory(search, sort, page, perPage, { category })

    // Additional client-side filtering for "various" search
    let filteredRecords = records
    if (search?.toLowerCase() === "various") {
      filteredRecords = records.filter((record) => {
        switch (category) {
          case "artists":
            return record.artist.toLowerCase() === "various"
          case "releases":
            return record.title.toLowerCase().includes("various")
          case "labels":
            return record.label?.toLowerCase().includes("various")
          default:
            return record.artist.toLowerCase() === "various"
        }
      })
    }

    if (filteredRecords.length === 0) {
      return <p className="text-center text-lg">No records found.</p>
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredRecords.map((record) => (
          <RecordCard key={record.id} record={record} />
        ))}
      </div>
    )
  } catch (error) {
    console.error("Failed to fetch records:", error)
    return <p className="text-center text-lg text-red-500">Failed to load records. Please try again later.</p>
  }
}

