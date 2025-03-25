import { NextRequest, NextResponse } from "next/server"
import { getDiscogsInventory, invalidateInventoryCache } from "@/lib/discogs"
import { serializeForClient } from "@/lib/utils"
import { getCachedData, setCachedData } from "@/lib/redis"
import { log } from "@/lib/logger"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const search = searchParams.get('q') || undefined
  const category = searchParams.get('category') || "everything"
  const genre = searchParams.get('genre') || undefined
  const sort = searchParams.get('sort') || "date-desc"
  const page = parseInt(searchParams.get('page') || "1")
  const perPage = 20
  const refresh = searchParams.get('refresh') === 'true'
  const includeAllFields = searchParams.get('include_all_fields') === 'true'
  
  // Log all search parameters for debugging
  log(`Records API called with params:`, { 
    search, 
    category, 
    genre, 
    sort, 
    page,
    refresh,
    includeAllFields 
  }, "info")
  
  // Create a unique cache key for this view
  const viewCacheKey = `view:${search || "all"}:${category}:${genre || "all"}:${sort}:${page}:${perPage}`;

  try {
    // Use central inventory cache via getDiscogsInventory
    // The refresh parameter will bypass cache if needed
    const options = {
      category,
      genre,
      fetchFullReleaseData: true,
      skipCache: refresh // Only skip cache if refresh parameter is true
    };

    // If this is a search and refresh parameter is set, invalidate the cache
    if (search && refresh) {
      log(`Force refreshing cache for search: ${search}`, {}, "info");
    }

    const result = await getDiscogsInventory(search, sort, page, perPage, options);
    
    // Get all records from the inventory
    const allRecords = result.records || [];
    
    // If we have a search query, perform additional filtering to ensure we only return relevant results
    let filteredRecords = allRecords;
    if (search) {
      const searchTerm = search.toLowerCase();
      log(`Filtering ${allRecords.length} records for search term "${searchTerm}"`, {}, "info");
      
      // Apply more strict filtering to ensure only relevant records are shown
      filteredRecords = allRecords.filter(record => {
        if (!record.title || !record.artist) {
          return false;
        }
        
        // Prepare all searchable fields
        const artist = record.artist.toLowerCase();
        const title = record.title.toLowerCase();
        const label = record.label?.toLowerCase() || "";
        const catalogNumber = record.catalogNumber?.toLowerCase() || "";
        
        // Create combined text of all searchable fields
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
        
        // Check if this record is relevant to the search
        const matchesSearch = allSearchableText.includes(searchTerm);
        
        // For special IDs like catalog numbers, do more specific checks
        const isSpecialId = (
          searchTerm.toUpperCase().includes('SURLTD') || 
          (searchTerm.includes('SUR') && !isNaN(parseInt(searchTerm.replace('SUR', ''))))
        );
        
        if (isSpecialId && (
          catalogNumber.includes(searchTerm) || 
          title.includes(searchTerm)
        )) {
          log(`Found special ID match: ${record.title}`, { id: record.id }, "info");
          return true;
        }
        
        // Check for exact matches in title/artist/label
        if (
          title === searchTerm || 
          artist === searchTerm ||
          label === searchTerm ||
          catalogNumber === searchTerm
        ) {
          log(`Found exact match: ${record.title}`, { id: record.id }, "info");
          return true;
        }
        
        // Return based on overall match
        return matchesSearch;
      });
      
      log(`Filtered to ${filteredRecords.length} relevant records`, {}, "info");
    }
    
    // Serialize records before returning
    const serializedRecords = filteredRecords.map((record) => serializeForClient(record));
    const totalRecords = serializedRecords.length;
    const totalPages = Math.ceil(totalRecords / perPage);
    
    // Return the data with cache information
    return NextResponse.json({
      records: serializedRecords,
      totalRecords,
      totalPages,
      page,
      fromCache: !refresh && !options.skipCache
    });
  } catch (error) {
    log("Failed to fetch records:", error, "error");
    
    // Return error response
    return NextResponse.json(
      { error: "Failed to fetch records" },
      { status: 500 }
    );
  }
}