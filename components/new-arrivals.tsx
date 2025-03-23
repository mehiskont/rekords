import { getDiscogsInventory } from "@/lib/discogs"
import { serializeForClient } from "@/lib/utils"
import { ApiUnavailable } from "@/components/api-unavailable"
import NewArrivalsClient from "./client-components/new-arrivals-client"
import { getCachedData, setCachedData } from "@/lib/redis"
import { log } from "@/lib/logger"

export async function NewArrivals() {
  // Cache key for new arrivals - with timestamp to refresh every hour
  const cacheKey = `newArrivals:${Math.floor(Date.now() / 3600000)}`; 
  let serializedRecords = [];
  let usedCache = false;

  try {
    // First try to get from cache
    const cachedData = await getCachedData(cacheKey);
    
    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData);
        if (Array.isArray(parsed) && parsed.length > 0) {
          serializedRecords = parsed;
          usedCache = true;
          log("Using cached new arrivals data", {}, "info");
        }
      } catch (error) {
        log("Error parsing cached new arrivals data", error, "warn");
      }
    }
    
    // If cache miss or error, fetch fresh data
    if (serializedRecords.length === 0) {
      // Use cached data from the main inventory endpoint (no cacheBuster)
      const { records } = await getDiscogsInventory(undefined, undefined, 1, 15, {
        sort: "listed",
        sort_order: "desc",
        fetchFullReleaseData: true
      });

      if (!records || records.length === 0) {
        return <p className="text-center text-lg">No new arrivals at the moment. Check back soon!</p>
      }

      // Stricter filtering for availability
      const availableRecords = records.filter(record => 
        record.quantity_available > 0 && 
        record.status === "For Sale"
      );
      
      // Take more records than needed in case some don't load properly
      const displayRecords = availableRecords.slice(0, 8);
      
      // Serialize records before passing to client component
      serializedRecords = displayRecords.map((record) => serializeForClient(record));
      
      // Cache the result for an hour
      if (serializedRecords.length > 0) {
        setCachedData(cacheKey, JSON.stringify(serializedRecords), 3600); // 1 hour cache
      }
    }
    
    // If we couldn't find any available records after everything
    if (serializedRecords.length === 0) {
      return <p className="text-center text-lg">No new arrivals at the moment. Check back soon!</p>
    }

    // Use the client component with up to 8 records to display
    return <NewArrivalsClient records={serializedRecords.slice(0, 8)} />
  } catch (error) {
    log("Error in NewArrivals:", error, "error");
    
    // If we have cached data, use it even if it's stale
    if (usedCache && serializedRecords.length > 0) {
      log("Using stale new arrivals cache due to error", {}, "warn");
      return <NewArrivalsClient records={serializedRecords.slice(0, 8)} />
    }
    
    return <ApiUnavailable />
  }
}