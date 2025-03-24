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

    // Fetch records from Discogs
    const { records, totalPages } = await getDiscogsInventory(normalizedQuery, undefined, page, perPage, {
      category,
      fetchFullReleaseData: true,
      cacheBuster: Date.now().toString(), // Always fetch fresh data
    })

    console.log(`Search found ${records.length} records for query "${normalizedQuery}"`)
    log(`Search found ${records.length} records for query "${normalizedQuery}"`, {}, "info")

    // Filter records based on search term and category
    const searchTerm = normalizedQuery
    
    // A more robust approach to searching through records
    const filteredRecords = records.filter((record) => {
      // Skip empty records
      if (!record) return false;
      
      try {
        // These fields should exist on most records
        const fieldsToSearch = {
          // Standard expected fields 
          title: record.title,
          artist: record.artist,
          label: record.label,
          id: record.id,
          catalogNumber: record.catalogNumber,
          
          // Extended fields that might contain the search term
          release: record.release,
          country: record.country,
          
          // Handle array fields with join if they exist
          format: Array.isArray(record.format) ? record.format.join(' ') : record.format,
          styles: Array.isArray(record.styles) ? record.styles.join(' ') : record.styles,
          genres: Array.isArray(record.genres) ? record.genres.join(' ') : record.genres
        };
        
        // Build a comprehensive search text that includes all available fields
        const allValuesText = Object.entries(fieldsToSearch)
          .filter(([_, value]) => value !== undefined && value !== null)
          .map(([_, value]) => String(value).toLowerCase())
          .join(' ');
        
        // Check all text-based fields for the search term
        const hasMatch = allValuesText.includes(searchTerm);
        
        // Check for partial matches in important identifiers
        // This is especially important for catalog numbers and IDs
        const idFields = [
          String(record.id || '').toLowerCase(),
          String(record.catalogNumber || '').toLowerCase(),
          String(record.release || '').toLowerCase()
        ];
        
        // If any ID field contains OR is contained by the search term, it's a partial match
        const hasPartialIdMatch = idFields.some(field => 
          (field.length >= 2 && field.includes(searchTerm)) || 
          (searchTerm.length >= 3 && searchTerm.includes(field))
        );
        
        // If search term appears to be an ID or catalog number
        const searchLooksLikeId = /^[a-z0-9]{3,}$/i.test(searchTerm);
        
        // For ID-like searches, prioritize ID field matching
        const idMatching = searchLooksLikeId && 
          idFields.some(field => field.includes(searchTerm) || searchTerm.includes(field));
          
        // Apply category-specific filtering
        switch (category) {
          case "artists":
            return String(record.artist || '').toLowerCase().includes(searchTerm);
          case "releases":
            return String(record.title || '').toLowerCase().includes(searchTerm) || hasPartialIdMatch;
          case "labels":
            return String(record.label || '').toLowerCase().includes(searchTerm);
          default:
            // "everything" - use our comprehensive search approach
            return hasMatch || hasPartialIdMatch || idMatching;
        }
      } catch (error) {
        console.error("Error filtering record:", error);
        log("Error filtering record", { error, recordId: record.id }, "error");
        return false;
      }
    });

    // Log the results for debugging
    console.log(`Filtered to ${filteredRecords.length} records after category filtering`);
    if (filteredRecords.length > 0) {
      console.log("First match:", {
        title: filteredRecords[0].title,
        artist: filteredRecords[0].artist,
        label: filteredRecords[0].label,
      });
      log("Search results found", {
        query: normalizedQuery,
        category,
        count: filteredRecords.length,
        firstMatch: {
          title: filteredRecords[0].title,
          artist: filteredRecords[0].artist,
          id: filteredRecords[0].id
        }
      }, "info");
    } else {
      // Log when searches return no results
      log("Search returned no results", {
        query: normalizedQuery,
        category,
        originalRecordsCount: records.length
      }, "warn");
      
      // If we found records but filtered them all out, use a more permissive search
      // as a fallback to ensure users see something relevant
      if (records.length > 0) {
        log("Applying fallback search with more permissive matching", {}, "info");
        
        // More permissive search that checks if ANY field contains the search term
        // or if the search term is contained within ANY field
        const fallbackResults = records.slice(0, 5).filter(record => {
          try {
            // Convert record to string representation of all values
            const recordAsString = JSON.stringify(record).toLowerCase();
            
            // If record string contains search term or vice versa
            return recordAsString.includes(searchTerm) || 
                  (searchTerm.length >= 3 && Object.keys(record).some(key => 
                     searchTerm.includes(String((record as any)[key] || '').toLowerCase())
                  ));
          } catch (e) {
            return false;
          }
        });
        
        if (fallbackResults.length > 0) {
          log("Found results using fallback search method", { count: fallbackResults.length }, "info");
          return NextResponse.json({
            records: fallbackResults,
            totalPages: 1,
          });
        }
      }
    }

    return NextResponse.json({
      records: filteredRecords,
      totalPages: Math.ceil(filteredRecords.length / perPage),
    });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Failed to search records", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

