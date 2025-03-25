import { getDiscogsInventory } from "@/lib/discogs"
import { serializeForClient } from "@/lib/utils"
import { ApiUnavailable } from "@/components/api-unavailable"
import NewArrivalsClient from "./client-components/new-arrivals-client"
import { getCachedData, setCachedData } from "@/lib/redis"
import { log } from "@/lib/logger"

export async function NewArrivals() {
  let serializedRecords = [];

  try {
    // Use the regular getDiscogsInventory which will use central cache
    log("Fetching new arrivals data from central cache", {}, "info");
    
    const { records } = await getDiscogsInventory(undefined, "date-desc", 1, 15, {
      // No need to set cacheBuster since central cache is already refreshed periodically
      sort: "listed",
      sort_order: "desc",
      fetchFullReleaseData: true,
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
    
    // Log details of new arrivals for debugging
    log("New arrivals:", displayRecords.map(r => ({
      id: r.id,
      title: r.title,
      artist: r.artist
    })), "info");
    
    // Serialize records before passing to client component
    serializedRecords = displayRecords.map((record) => serializeForClient(record));
    
    // If we couldn't find any available records after everything
    if (serializedRecords.length === 0) {
      return <p className="text-center text-lg">No new arrivals at the moment. Check back soon!</p>
    }

    // Use the client component with up to 8 records to display
    return <NewArrivalsClient records={serializedRecords.slice(0, 8)} />
  } catch (error) {
    log("Error in NewArrivals:", error, "error");
    return <ApiUnavailable />
  }
}