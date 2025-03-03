import { getDiscogsInventory } from "@/lib/discogs"
import { serializeForClient } from "@/lib/utils"
import { ApiUnavailable } from "@/components/api-unavailable"
import { ClientRecordCard } from "@/components/client-record-card"

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
    // Add a small cacheBuster for search views to ensure fresh availability data
    const { records } = await getDiscogsInventory(search, sort, page, perPage, {
      category,
      fetchFullReleaseData: true,
      cacheBuster: search ? Date.now().toString() : undefined // Only add cacheBuster for searches
    })

    if (!records || records.length === 0) {
      return <p className="text-center text-lg">No records found.</p>
    }

    // Serialize records before passing to client component
    const serializedRecords = records.map((record) => serializeForClient(record))

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {serializedRecords.map((record) => (
          <ClientRecordCard key={record.id} record={record} />
        ))}
      </div>
    )
  } catch (error) {
    console.error("Failed to fetch records:", error)
    return <ApiUnavailable />
  }
}

