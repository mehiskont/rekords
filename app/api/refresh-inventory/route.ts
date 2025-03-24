import { NextResponse } from "next/server"
import { getDiscogsInventory } from "@/lib/discogs"
import { flushCache } from "@/lib/redis"
import { log } from "@/lib/logger"

export async function POST() {
  try {
    // First clear all inventory caches
    log("Clearing inventory cache")
    const clearedKeys = await flushCache("inventory:*")
    
    // Also clear view caches
    await flushCache("view:*")
    
    log(`Cleared ${clearedKeys} cached inventory keys`)
    
    // Fetch fresh data with cacheBuster to ensure we get latest data
    const timestamp = Date.now().toString()
    
    // Fetch new arrivals (most recently listed)
    const newArrivals = await getDiscogsInventory(undefined, "date-desc", 1, 20, {
      cacheBuster: timestamp,
      fetchFullReleaseData: true
    })
    
    // Fetch all records (main page view)
    const allRecords = await getDiscogsInventory(undefined, undefined, 1, 50, {
      cacheBuster: timestamp,
      fetchFullReleaseData: true
    })
    
    log(`Inventory refresh complete - found ${newArrivals.records.length} new arrivals and ${allRecords.records.length} total records`)
    
    return NextResponse.json({ 
      success: true,
      message: "Inventory refreshed successfully",
      recordCount: allRecords.records.length,
      newArrivalsCount: newArrivals.records.length,
      timestamp: timestamp
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