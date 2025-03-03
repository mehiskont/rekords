import { NextResponse } from 'next/server'
import { clearCachedData } from '@/lib/redis'
import { getDiscogsInventory } from '@/lib/discogs'

export async function POST() {
  try {
    // First, clear all inventory cache
    await clearCachedData('inventory:*')
    
    // Then, fetch fresh data to repopulate the cache
    // Getting just a small batch to kick-start the cache refresh
    await getDiscogsInventory(undefined, undefined, 1, 12, {
      cacheBuster: Date.now().toString(),
      fetchFullReleaseData: true,
    })
    
    return NextResponse.json({
      success: true,
      message: 'Inventory cache refreshed successfully'
    })
  } catch (error) {
    console.error('Error refreshing inventory:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to refresh inventory' },
      { status: 500 }
    )
  }
}