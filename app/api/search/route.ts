import { NextResponse } from "next/server"
import { getDiscogsInventory } from "@/lib/discogs"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get("q")
  const category = searchParams.get("category") || "everything"
  const page = Number(searchParams.get("page")) || 1
  const perPage = Number(searchParams.get("per_page")) || 20

  try {
    const { records, totalPages } = await getDiscogsInventory(query || undefined, undefined, page, perPage, {
      category,
      fetchFullReleaseData: true, // Add this to ensure we get catalog numbers for search results
    })

    // Enhanced filtering based on category and query
    let filteredRecords = records
    if (query) {
      const searchTerm = query.toLowerCase()
      filteredRecords = records.filter((record) => {
        const isVariousArtist =
          record.artist.toLowerCase() === "various" ||
          record.artist.toLowerCase() === "various artists" ||
          record.title.toLowerCase().includes("various")

        switch (category) {
          case "artists":
            if (searchTerm === "various") {
              return isVariousArtist
            }
            return record.artist.toLowerCase().includes(searchTerm)
          case "releases":
            return record.title.toLowerCase().includes(searchTerm)
          case "labels":
            return record.label?.toLowerCase().includes(searchTerm)
          default:
            // "everything" - search across all fields
            if (searchTerm === "various") {
              return isVariousArtist
            }
            return (
              record.title.toLowerCase().includes(searchTerm) ||
              record.artist.toLowerCase().includes(searchTerm) ||
              record.label?.toLowerCase().includes(searchTerm) ||
              record.catalogNumber?.toLowerCase().includes(searchTerm)
            )
        }
      })
    }

    return NextResponse.json({
      records: filteredRecords.slice(0, perPage),
      totalPages: Math.ceil(filteredRecords.length / perPage),
    })
  } catch (error) {
    console.error("Search error:", error)
    return NextResponse.json(
      { error: "Failed to search records", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}

