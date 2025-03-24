import { NextResponse } from "next/server"
import { getDiscogsInventory } from "@/lib/discogs"
import { log } from "@/lib/logger"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get("q")
  const category = searchParams.get("category") || "everything"
  const page = Number(searchParams.get("page")) || 1
  const perPage = Number(searchParams.get("per_page")) || 20

  console.log("Search API called with params:", { query, category, page, perPage })
  log("Search API called with params:", { query, category, page, perPage }, "info")

  try {
    // Don't perform search if query is empty or too short
    if (!query || query.length < 2) {
      return NextResponse.json({ records: [], totalPages: 0 })
    }

    // Normalize search query - remove extra spaces and convert to lowercase
    const normalizedQuery = query.trim().toLowerCase()

    // No need to use fetch here, just directly use the getDiscogsInventory with cacheBuster
    const { records, totalPages } = await getDiscogsInventory(normalizedQuery, undefined, page, perPage, {
      category,
      fetchFullReleaseData: true,
      cacheBuster: Date.now().toString(), // Always fetch fresh data
    })

    console.log(`Search found ${records.length} records for query "${normalizedQuery}"`)
    log(`Search found ${records.length} records for query "${normalizedQuery}"`, {}, "info")

    // Filter records based on search term and category
    const searchTerm = normalizedQuery
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
      const id = record.id?.toString().toLowerCase() || ""
      
      // Handle potentially null/undefined fields with safer conversions
      let release = ""
      let format = ""
      let styles = ""
      let genres = ""
      
      try {
        release = String(record.release || "").toLowerCase()
        
        if (Array.isArray(record.format)) {
          format = record.format.join(' ').toLowerCase()
        } else if (record.format) {
          format = String(record.format).toLowerCase()
        }
        
        if (Array.isArray(record.styles)) {
          styles = record.styles.join(' ').toLowerCase()
        } else if (record.styles) {
          styles = String(record.styles).toLowerCase()
        }
        
        if (Array.isArray(record.genres)) {
          genres = record.genres.join(' ').toLowerCase()
        } else if (record.genres) {
          genres = String(record.genres).toLowerCase()
        }
      } catch (e) {
        console.error("Error processing record fields:", e)
      }
      
      // Debug record details
      if (title.includes(searchTerm) || artist.includes(searchTerm) || id.includes(searchTerm)) {
        console.log(`Potential match: "${title}" by "${artist}" (ID: ${id}) - includes "${searchTerm}"? ` + 
          (title.includes(searchTerm) || artist.includes(searchTerm) || id.includes(searchTerm)));
      }

      // Add debugging for this specific record
      if (record.title === 'SURLTD02' || record.title?.includes('SURLTD') || id.includes('surltd')) {
        console.log('Found SURLTD record:', record);
        console.log('Searching for term:', searchTerm);
        console.log('Record title:', title);
        console.log('Record artist:', artist);
        console.log('Record label:', label);
        console.log('Record catalog:', catalogNumber);
        console.log('Record id:', id);
        console.log('Record release:', release);
      }
      
      // Create a single string with all searchable fields for more comprehensive search
      const allSearchableText = [
        title,
        artist,
        label,
        catalogNumber,
        id,
        release,
        format,
        styles,
        genres,
        record.country?.toLowerCase() || '',
      ].join(' ');
      
      // Check if any field contains the exact search term
      const exactMatch = allSearchableText.includes(searchTerm);
      
      // Check for partial matches in catalog numbers and IDs
      // This helps with cases where someone searches for part of a catalog number
      const partialIdMatch = (
        (catalogNumber && searchTerm.length > 2 && (
          catalogNumber.includes(searchTerm) || 
          searchTerm.includes(catalogNumber)
        )) ||
        (id && searchTerm.length > 2 && (
          id.includes(searchTerm) || 
          searchTerm.includes(id)
        ))
      );
      
      // If searching for something that looks like a catalog number or ID,
      // prioritize matching in those fields
      const searchLooksLikeId = /^[a-z0-9]{3,}$/i.test(searchTerm);
      
      switch (category) {
        case "artists":
          return artist.includes(searchTerm)
        case "releases":
          return title.includes(searchTerm) || id.includes(searchTerm) || partialIdMatch
        case "labels":
          return label.includes(searchTerm)
        default:
          // "everything" - search across all fields including the combined text
          return (
            exactMatch || 
            title.includes(searchTerm) ||
            artist.includes(searchTerm) ||
            label.includes(searchTerm) ||
            catalogNumber.includes(searchTerm) ||
            id.includes(searchTerm) ||
            release.includes(searchTerm) ||
            partialIdMatch ||
            (searchLooksLikeId && (
              id.includes(searchTerm) || 
              catalogNumber.includes(searchTerm) ||
              searchTerm.includes(id) || 
              searchTerm.includes(catalogNumber)
            ))
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
      log("Search results found", {
        query: normalizedQuery,
        category,
        count: filteredRecords.length,
        firstMatch: {
          title: filteredRecords[0].title,
          artist: filteredRecords[0].artist,
          id: filteredRecords[0].id
        }
      }, "info")
    } else {
      // Log when searches return no results - this helps identify patterns of failed searches
      log("Search returned no results", {
        query: normalizedQuery,
        category,
        originalRecordsCount: records.length
      }, "warn")
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

