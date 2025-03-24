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

    // No need to use fetch here, just directly use the getDiscogsInventory with cacheBuster
    const { records, totalPages } = await getDiscogsInventory(query, undefined, page, perPage, {
      category,
      fetchFullReleaseData: true,
      cacheBuster: Date.now().toString(), // Always fetch fresh data
    })

    console.log(`Search found ${records.length} records for query "${query}"`)

    // Filter records based on search term and category
    const searchTerm = query.toLowerCase()
    const filteredRecords = records.filter((record) => {
      // Skip records with missing critical data
      if (!record.title || !record.artist) {
        console.log("Skipping record with missing data:", record.id);
        return false;
      }
      
      const artist = record.artist?.toLowerCase() || ""
      const title = record.title?.toLowerCase() || ""
      const label = record.label?.toLowerCase() || ""
      const catalogNumber = record.catalogNumber?.toLowerCase() || ""

      // Debug record details
      if (title.includes(searchTerm) || artist.includes(searchTerm)) {
        console.log(`Potential match: "${title}" by "${artist}" - includes "${searchTerm}"? ` + 
          (title.includes(searchTerm) || artist.includes(searchTerm)));
      }

      // Add debugging for this specific record
      if (record.title === 'SURLTD02' || record.title?.includes('SURLTD')) {
        console.log('Found SURLTD record:', record);
        console.log('Searching for term:', searchTerm);
        console.log('Record title:', title);
        console.log('Record artist:', artist);
        console.log('Record label:', label);
        console.log('Record catalog:', catalogNumber);
        // Additional fields that might contain the search term
        console.log('Record id:', record.id);
        console.log('Record release:', record.release);
      }

      // For reference, get all keys available on the record
      const allKeys = Object.keys(record);
      
      // Create a single string with all searchable fields for more comprehensive search
      const allSearchableText = [
        title,
        artist,
        label,
        catalogNumber,
        record.release?.toString().toLowerCase() || '',
        record.format?.join(' ').toLowerCase() || '',
        record.styles?.join(' ').toLowerCase() || '',
        record.genres?.join(' ').toLowerCase() || '',
        record.country?.toLowerCase() || '',
      ].join(' ');
      
      // First check if any field contains the exact search term
      const exactMatch = allSearchableText.includes(searchTerm);
      
      switch (category) {
        case "artists":
          return artist.includes(searchTerm)
        case "releases":
          return title.includes(searchTerm)
        case "labels":
          return label.includes(searchTerm)
        default:
          // "everything" - search across all fields including the combined text
          return (
            exactMatch || 
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

