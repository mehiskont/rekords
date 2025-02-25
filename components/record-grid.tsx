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
    console.log("Fetching records with params:", { search, category, sort, page, perPage })
    const { records } = await getDiscogsInventory(search, sort, page, perPage, {
      category,
      fetchFullReleaseData: true,
    })

    console.log("Received records:", records.slice(0, 2)) // Log first two records for debugging

    if (!records || records.length === 0) {
      return <p className="text-center text-lg">No records found.</p>
    }

    // Serialize records before passing to client component
    const serializedRecords = records.map((record) => serializeForClient(record))
    console.log("Serialized records:", serializedRecords.slice(0, 2)) // Log serialized records

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

