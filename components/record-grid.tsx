import { getDiscogsInventory } from "@/lib/discogs"
import { serializeForClient } from "@/lib/utils"
import { ApiUnavailable } from "@/components/api-unavailable"
import RecordGridClient from "./client-components/record-grid-client"
import { getCachedData, setCachedData } from "@/lib/redis"
import { log } from "@/lib/logger"

interface RecordGridProps {
  searchParams?: { [key: string]: string | string[] | undefined }
}

export async function RecordGrid({ searchParams = {} }: RecordGridProps) {
  const search = typeof searchParams.q === "string" ? searchParams.q : undefined
  const category = typeof searchParams.category === "string" ? searchParams.category : "everything"
  const sort = typeof searchParams.sort === "string" ? searchParams.sort : undefined
  const page = typeof searchParams.page === "string" ? Number.parseInt(searchParams.page) : 1
  const perPage = 20

  // Create a unique cache key for this view
  const viewCacheKey = `view:${search || "all"}:${category}:${sort || "default"}:${page}:${perPage}`;
  let records = [];
  let usedCache = false;

  try {
    // First try to get from cache with a very short TTL for initial render
    const cachedView = await getCachedData(viewCacheKey);
    if (cachedView) {
      try {
        const parsed = JSON.parse(cachedView);
        if (parsed?.length > 0) {
          records = parsed;
          usedCache = true;
          log(`Using cached view data for ${viewCacheKey}`, {}, "info");
        }
      } catch (error) {
        log(`Error parsing cached view data`, error, "warn");
      }
    }

    // If no cache or empty cache, fetch fresh data
    if (records.length === 0) {
      // Use cacheBuster only for real-time data needs or admin views
      const needsFreshData = search?.includes("admin") || false;
      
      const options = {
        category,
        fetchFullReleaseData: true,
        ...(needsFreshData ? { cacheBuster: Date.now().toString() } : {})
      };

      const result = await getDiscogsInventory(search, sort, page, perPage, options);
      
      // Serialize records before passing to client component
      records = result.records ? result.records.map((record) => serializeForClient(record)) : [];
      
      // Cache this view for a short time (2 minutes)
      if (records.length > 0) {
        setCachedData(viewCacheKey, JSON.stringify(records), 120);
      }
    }

    // Return client component with data
    return <RecordGridClient records={records} />
  } catch (error) {
    log("Failed to fetch records:", error, "error");
    
    // If we have cache, use it even if it's stale to ensure some data is displayed
    if (usedCache && records.length > 0) {
      log("Using stale cache due to fetch error", {}, "warn");
      return <RecordGridClient records={records} />
    }
    
    return <ApiUnavailable />
  }
}