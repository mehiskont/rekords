import { NextResponse } from "next/server"
import { getDiscogsInventory } from "@/lib/discogs"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get("q")
  const category = searchParams.get("category") || "everything"
  const page = Number(searchParams.get("page")) || 1
  const perPage = Number(searchParams.get("per_page")) || 20

  console.log("Search API called with params:", { query, category, page, perPage })

  try {
    // Don't perform search if query is empty or too short
    if (!query || query.length < 2) {
      return NextResponse.json({ records: [], totalPages: 0 })
    }

    const { records, totalPages } = await getDiscogsInventory(query, undefined, page, perPage, {
      category,
      fetchFullReleaseData: true,
    })

    console.log(`Search found ${records.length} records for query "${query}"`)

    // Filter records based on search term and category
    const searchTerm = query.toLowerCase()
    const filteredRecords = records.filter((record) => {
      const artist = record.artist?.toLowerCase() || ""
      const title = record.title?.toLowerCase() || ""
      const label = record.label?.toLowerCase() || ""
      const catalogNumber = record.catalogNumber?.toLowerCase() || ""

      const isVariousArtist = artist === "various" || artist === "various artists" || title.includes("various")

      switch (category) {
        case "artists":
          if (searchTerm === "various") {
            return isVariousArtist
          }
          return artist.includes(searchTerm)
        case "releases":
          return title.includes(searchTerm)
        case "labels":
          return label.includes(searchTerm)
        default:
          // "everything" - search across all fields
          return (
            title.includes(searchTerm) ||
            artist.includes(searchTerm) ||
            label.includes(searchTerm) ||
            catalogNumber.includes(searchTerm)
          )
      }
    })

    // Log the results for debugging
    console.log(`Filtered to ${filteredRecords.length} records after category filtering`)
    if (filteredRecords.length > 0) {
      console.log("First match:", {
        title: filteredRecords[0].title,
        artist: filteredRecords[0].artist,
        label: filteredRecords[0].label,
      })
    }

    return NextResponse.json({
      records: filteredRecords,
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

