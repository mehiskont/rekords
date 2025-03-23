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
    // Skip cache if refresh parameter is provided
    if (!refresh) {
      // First try to get from cache
      const cachedView = await getCachedData(viewCacheKey);
      if (cachedView) {
        try {
          const parsed = JSON.parse(cachedView);
          if (parsed?.data?.length > 0) {
            records = parsed.data;
            totalRecords = parsed.totalRecords || 0;
            totalPages = parsed.totalPages || 1;
            usedCache = true;
            log(`Using cached view data for ${viewCacheKey}`, {}, "info");
            
            // Return cached data immediately
            return NextResponse.json({
              records,
              totalRecords,
              totalPages,
              page,
              fromCache: true
            });
          }
        } catch (error) {
          log(`Error parsing cached view data`, error, "warn");
        }
      }
    }

    // If no cache or refresh requested, fetch fresh data
    const needsFreshData = search?.includes("admin") || !!refresh;
    
    const options = {
      category,
      genre,
      fetchFullReleaseData: true,
      ...(needsFreshData ? { cacheBuster: Date.now().toString() } : {})
    };

    const result = await getDiscogsInventory(search, sort, page, perPage, options);
    
    // Serialize records before returning
    records = result.records ? result.records.map((record) => serializeForClient(record)) : [];
    totalRecords = result.pagination?.total || records.length;
    totalPages = result.pagination?.pages || Math.ceil(totalRecords / perPage);
    
    // Cache this view for a short time (2 minutes)
    if (records.length > 0 && !refresh) {
      setCachedData(viewCacheKey, JSON.stringify({
        data: records,
        totalRecords,
        totalPages
      }), 120);
    }

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