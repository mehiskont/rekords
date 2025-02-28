import { NextRequest, NextResponse } from 'next/server'
import { updateDiscogsInventory } from '@/lib/discogs'

export async function POST(request: NextRequest) {
  try {
    const { listingId, quantity } = await request.json()
    
    if (!listingId) {
      return NextResponse.json({ success: false, error: 'Missing listing ID' }, { status: 400 })
    }
    
    const success = await updateDiscogsInventory(listingId, quantity || 1)
    
    return NextResponse.json({ success, listingId, quantity })
  } catch (error) {
    console.error('Debug endpoint error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}