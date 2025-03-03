import { NextResponse } from "next/server"
import { getDiscogsInventory } from "@/lib/discogs"
import { clearCachedData } from "@/lib/redis"
import { log } from "@/lib/logger"

export async function POST() {
  try {
    // Step 1: Clear all inventory-related caches
    log("Refreshing inventory: clearing caches")
    const clearedInventoryKeys = await clearCachedData("inventory:*")
    const clearedRecordKeys = await clearCachedData("record:*")
    
    log(`Cleared ${clearedInventoryKeys} inventory cache entries and ${clearedRecordKeys} record cache entries`)
    
    // Step 2: Fetch fresh data for primary views to rebuild cache
    log("Fetching latest inventory data to rebuild cache")
    
    // Prefetch the main views used on the site with cache buster to ensure freshness
    const cacheBuster = Date.now().toString()
    
    // Fetch new arrivals (most recently listed)
    await getDiscogsInventory(undefined, undefined, 1, 20, {
      sort: "listed",
      sort_order: "desc",
      fetchFullReleaseData: true,
      cacheBuster
    })
    
    // Fetch all records (main page view)
    await getDiscogsInventory(undefined, undefined, 1, 50, {
      fetchFullReleaseData: true,
      cacheBuster
    })
    
    log("Inventory refresh complete - cache rebuilt with fresh data")
    
    return NextResponse.json({ 
      success: true,
      message: "Inventory refreshed successfully",
      cacheCleared: {
        inventoryEntries: clearedInventoryKeys,
        recordEntries: clearedRecordKeys
      }
    })
    
  } catch (error) {
    log(`Error refreshing inventory: ${error instanceof Error ? error.message : String(error)}`, "error")
    
    return NextResponse.json(
      { 
        success: false,
        message: "Failed to refresh inventory",
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

// Also handle GET requests for manual triggering
export async function GET() {
  return this.POST()
}