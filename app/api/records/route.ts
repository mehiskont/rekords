import { NextRequest, NextResponse } from "next/server"
import { getDiscogsInventory } from "@/lib/discogs"
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
  const refresh = searchParams.get('refresh') || undefined

  // Create a unique cache key for this view
  const viewCacheKey = `view:${search || "all"}:${category}:${genre || "all"}:${sort}:${page}:${perPage}`;
  let records = [];
  let totalRecords = 0;
  let totalPages = 1;
  let usedCache = false;

  try {
    // Always use fresh data, disable all caching
    log(`Fetching fresh data for ${viewCacheKey}`, {}, "info");

    // Always use fresh data with cacheBuster
    const options = {
      category,
      genre,
      fetchFullReleaseData: true,
      cacheBuster: Date.now().toString()
    };

    const result = await getDiscogsInventory(search, sort, page, perPage, options);
    
    // Serialize records before returning
    records = result.records ? result.records.map((record) => serializeForClient(record)) : [];
    totalRecords = result.pagination?.total || records.length;
    totalPages = result.pagination?.pages || Math.ceil(totalRecords / perPage);
    
    // Disable caching completely
    log(`Skipping view cache for ${viewCacheKey}`, {}, "info");

    // Return fresh data
    return NextResponse.json({
      records,
      totalRecords,
      totalPages,
      page,
      fromCache: false
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