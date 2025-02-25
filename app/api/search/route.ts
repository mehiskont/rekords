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
        // Safely check for undefined properties
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
            if (searchTerm === "various") {
              return isVariousArtist
            }
            return (
              title.includes(searchTerm) ||
              artist.includes(searchTerm) ||
              label.includes(searchTerm) ||
              catalogNumber.includes(searchTerm)
            )
        }
      })
    }

    // After fetching records from getDiscogsInventory
    console.log("Search results:", filteredRecords.slice(0, 3)) // Log first 3 records for debugging

    // Validate records before returning
    const validatedRecords = filteredRecords
      .filter((record) => record && typeof record.price === "number")
      .map((record) => ({
        ...record,
        price: record.price || 0,
        condition: record.condition || "Unknown",
        label: record.label || "Unknown Label",
        catalogNumber: record.catalogNumber || "",
      }))

    return NextResponse.json({
      records: validatedRecords.slice(0, perPage),
      totalPages: Math.ceil(validatedRecords.length / perPage),
    })
  } catch (error) {
    console.error("Search error:", error)
    return NextResponse.json(
      { error: "Failed to search records", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}

