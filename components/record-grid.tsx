import Link from "next/link"
import { getDiscogsInventory } from "@/lib/discogs"
import { RecordCard } from "@/components/record-card"
import { Button } from "@/components/ui/button"

export async function RecordGrid({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const search = typeof searchParams.search === "string" ? searchParams.search : undefined
  const sort = typeof searchParams.sort === "string" ? searchParams.sort : undefined
  const page = typeof searchParams.page === "string" ? Number.parseInt(searchParams.page) : 1
  const perPage = 20

  try {
    const { records, totalPages } = await getDiscogsInventory(search, sort, page, perPage)

    if (records.length === 0) {
      return <p className="text-center text-lg">No records found.</p>
    }

    return (
      <>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
          {records.map((record) => (
            <RecordCard key={record.id} record={record} />
          ))}
        </div>
        <div className="flex justify-center gap-2">
          {page > 1 && (
            <Link href={{ query: { ...searchParams, page: page - 1 } }}>
              <Button variant="outline">Previous</Button>
            </Link>
          )}
          {page < totalPages && (
            <Link href={{ query: { ...searchParams, page: page + 1 } }}>
              <Button variant="outline">Next</Button>
            </Link>
          )}
        </div>
      </>
    )
  } catch (error) {
    console.error("Failed to fetch records:", error)
    return <p className="text-center text-lg text-red-500">Failed to load records. Please try again later.</p>
  }
}

