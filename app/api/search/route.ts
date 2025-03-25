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

    // Always use a larger page size for short queries (3 chars or less) to improve results
    const effectivePerPage = normalizedQuery.length <= 3 ? Math.max(perPage, 50) : perPage;

    // Fetch records from Discogs
    const { records, totalPages } = await getDiscogsInventory(normalizedQuery, undefined, page, effectivePerPage, {
      category,
      fetchFullReleaseData: true,
      cacheBuster: Date.now().toString(), // Always fetch fresh data
    })

    console.log(`Search found ${records.length} records for query "${normalizedQuery}"`)
    log(`Search found ${records.length} records for query "${normalizedQuery}"`, {}, "info")

    // Filter records based on search term and category
    const searchTerm = normalizedQuery

    // Determine if the search term looks like an ID or catalog number
    // This helps us prioritize results appropriately  
    const looksLikeIdentifier = /^[a-z0-9]{2,}$/i.test(searchTerm);
    
    // First pass: identify priority matches based on general patterns
    // We'll prioritize these in the results
    const priorityMatches = records.filter(record => {
      if (!record) return false;
      
      try {
        // Check for exact matches in important identifiers
        const exactCatalogMatch = String(record.catalogNumber || '').toLowerCase() === searchTerm;
        const exactIdMatch = String(record.id || '').toLowerCase() === searchTerm;
        const exactTitleMatch = String(record.title || '').toLowerCase() === searchTerm;
        
        // For very short search terms that look like identifiers, prioritize prefix matches
        // This handles cases where someone types the beginning of a catalog number
        if (looksLikeIdentifier && searchTerm.length <= 3) {
          const catalogNum = String(record.catalogNumber || '').toLowerCase();
          const id = String(record.id || '').toLowerCase();
          const title = String(record.title || '').toLowerCase();
          
          // Prioritize if the catalog number or ID starts with the search term
          // This is especially useful for catalog number searches
          const isPrefixMatch = 
            catalogNum.startsWith(searchTerm) || 
            id.startsWith(searchTerm) ||
            title.startsWith(searchTerm);
            
          if (isPrefixMatch) {
            return true;
          }
        }
        
        // Exact matches take priority
        return exactCatalogMatch || exactIdMatch || exactTitleMatch;
      } catch (e) {
        return false;
      }
    });
    
    // Log priority matches for debugging
    if (priorityMatches.length > 0) {
      log(`Found ${priorityMatches.length} priority matches`, 
        priorityMatches.slice(0, 3).map(r => ({id: r.id, title: r.title})), 
        "info");
    }
    
    // Second pass: normal search through all fields
    const filteredRecords = records.filter((record) => {
      // Skip empty records
      if (!record) return false;
      
      // Add priority matches first
      if (priorityMatches.some(pr => pr.id === record.id)) {
        return true;
      }
      
      try {
        // Build a comprehensive set of fields to search through
        const fieldsToSearch = {
          // Standard fields 
          title: record.title,
          artist: record.artist,
          label: record.label,
          id: record.id,
          catalogNumber: record.catalogNumber,
          
          // Extended fields
          release: record.release,
          country: record.country,
          
          // Array fields with join
          format: Array.isArray(record.format) ? record.format.join(' ') : record.format,
          styles: Array.isArray(record.styles) ? record.styles.join(' ') : record.styles,
          genres: Array.isArray(record.genres) ? record.genres.join(' ') : record.genres
        };
        
        // Build a comprehensive search text
        const allValuesText = Object.entries(fieldsToSearch)
          .filter(([_, value]) => value !== undefined && value !== null)
          .map(([_, value]) => String(value).toLowerCase())
          .join(' ');
        
        // Check if any text field contains the search term
        const hasMatch = allValuesText.includes(searchTerm);
        
        // Extract key identifiers for more specific matching
        const idFields = [
          String(record.id || '').toLowerCase(),
          String(record.catalogNumber || '').toLowerCase(),
          String(record.release || '').toLowerCase()
        ];
        
        // For identifier-like searches, check for partial matches
        const hasPartialIdMatch = looksLikeIdentifier && idFields.some(field => 
          (field.length >= 2 && field.includes(searchTerm)) || 
          (searchTerm.length >= 3 && searchTerm.includes(field))
        );
        
        // For short queries, check if any field starts with the search term
        const hasPrefixMatch = searchTerm.length <= 3 && (
          String(record.title || '').toLowerCase().startsWith(searchTerm) ||
          String(record.catalogNumber || '').toLowerCase().startsWith(searchTerm) ||
          String(record.id || '').toLowerCase().startsWith(searchTerm) ||
          String(record.label || '').toLowerCase().startsWith(searchTerm)
        );
        
        // Apply category-specific filtering
        switch (category) {
          case "artists":
            return String(record.artist || '').toLowerCase().includes(searchTerm);
          case "releases":
            return String(record.title || '').toLowerCase().includes(searchTerm) || 
                   hasPartialIdMatch || 
                   hasPrefixMatch;
          case "labels":
            return String(record.label || '').toLowerCase().includes(searchTerm);
          default:
            // "everything" - use our comprehensive search approach
            return hasMatch || hasPartialIdMatch || hasPrefixMatch;
        }
      } catch (error) {
        console.error("Error filtering record:", error);
        log("Error filtering record", { error, recordId: record.id }, "error");
        return false;
      }
    });

    // Combine priority matches with filtered records, ensuring no duplicates
    const combinedResults = Array.from(new Set([...priorityMatches, ...filteredRecords]));

    // Log the results for debugging
    console.log(`Filtered to ${combinedResults.length} records after filtering`);
    if (combinedResults.length > 0) {
      console.log("First match:", {
        title: combinedResults[0].title,
        artist: combinedResults[0].artist,
        label: combinedResults[0].label,
      });
      log("Search results found", {
        query: normalizedQuery,
        category,
        count: combinedResults.length,
        firstMatch: {
          title: combinedResults[0].title,
          artist: combinedResults[0].artist,
          id: combinedResults[0].id
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
                  (searchTerm.length >= 2 && Object.keys(record).some(key => {
                    const value = (record as any)[key];
                    if (value === null || value === undefined) return false;
                    const valueStr = String(value).toLowerCase();
                    return searchTerm.includes(valueStr) || valueStr.includes(searchTerm);
                  }));
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
      records: combinedResults,
      totalPages: Math.ceil(combinedResults.length / perPage),
    });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Failed to search records", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

