import { NextResponse } from "next/server"
import { getDiscogsInventory } from "@/lib/discogs"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get("q")
  const category = searchParams.get("category") || "everything"
  const page = Number(searchParams.get("page")) || 1
  const perPage = Number(searchParams.get("per_page")) || 20

  try {
    const { records, totalPages } = await getDiscogsInventory(query || undefined, undefined, page, perPage)

    // Filter records based on category if needed
    let filteredRecords = records
    if (category !== "everything") {
      filteredRecords = records.filter((record) => {
        switch (category) {
          case "releases":
            return true // All records are releases
          case "artists":
            return record.artist.toLowerCase().includes((query || "").toLowerCase())
          case "labels":
            return record.label?.toLowerCase().includes((query || "").toLowerCase())
          default:
            return true
        }
      })
    }

    return NextResponse.json({
      records: filteredRecords,
      totalPages,
    })
  } catch (error) {
    console.error("Search error:", error)
    return NextResponse.json({ error: "Failed to search records" }, { status: 500 })
  }
}

