import { NextResponse } from "next/server"
import { getDiscogsInventory } from "@/lib/discogs"
import { clearCachedData } from "@/lib/redis"
import { log } from "@/lib/logger"

export async function POST() {
  try {
    // Fetch fresh data for main views - no cache anymore
    log("Fetching latest inventory data")
    
    // Don't use cache anymore - always fetch fresh data
    const timestamp = Date.now().toString()
    
    // Fetch new arrivals (most recently listed)
    await getDiscogsInventory(undefined, undefined, 1, 20, {
      sort: "listed", 
      sort_order: "desc",
      fetchFullReleaseData: true
    })
    
    // Fetch all records (main page view)
    await getDiscogsInventory(undefined, undefined, 1, 50, {
      fetchFullReleaseData: true
    })
    
    log("Inventory refresh complete - fresh data fetched")
    
    return NextResponse.json({ 
      success: true,
      message: "Inventory refreshed successfully",
      timestamp: Date.now()
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