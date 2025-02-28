import { NextRequest, NextResponse } from 'next/server'
import { log } from '@/lib/utils'

// Base URL for Discogs API
const BASE_URL = 'https://api.discogs.com'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const action = searchParams.get('action') || 'test'
  const listingId = searchParams.get('id') || '1234567890' // Use a test ID or one from your store
  
  try {
    // Test authentication first
    const tokenResponse = await fetch(`${BASE_URL}/oauth/identity`, {
      headers: {
        'Authorization': `Discogs token=${process.env.DISCOGS_API_TOKEN}`,
        'User-Agent': 'PlastikRecordStore/1.0'
      }
    })
    
    const tokenData = await tokenResponse.json()
    
    if (!tokenResponse.ok) {
      return NextResponse.json({ 
        success: false, 
        error: 'Authentication failed',
        details: tokenData,
        status: tokenResponse.status
      }, { status: 401 })
    }
    
    // If authentication works, test specific actions
    if (action === 'get') {
      // Test fetching a listing
      const listingResponse = await fetch(`${BASE_URL}/marketplace/listings/${listingId}`, {
        headers: {
          'Authorization': `Discogs token=${process.env.DISCOGS_API_TOKEN}`,
          'User-Agent': 'PlastikRecordStore/1.0'
        }
      })
      
      const listingData = await listingResponse.json()
      return NextResponse.json({ 
        success: listingResponse.ok, 
        data: listingData,
        status: listingResponse.status
      })
    } else if (action === 'update') {
      // First get the listing
      const getResponse = await fetch(`${BASE_URL}/marketplace/listings/${listingId}`, {
        headers: {
          'Authorization': `Discogs token=${process.env.DISCOGS_API_TOKEN}`,
          'User-Agent': 'PlastikRecordStore/1.0'
        }
      })
      
      if (!getResponse.ok) {
        return NextResponse.json({ 
          success: false, 
          error: 'Could not fetch listing',
          details: await getResponse.text(),
          status: getResponse.status
        })
      }
      
      const listing = await getResponse.json()
      
      // Then update with one less quantity
      const currentQuantity = parseInt(listing.quantity || '1')
      const newQuantity = Math.max(1, currentQuantity - 1) // Ensure at least 1
      
      // Try the update
      const updateResponse = await fetch(`${BASE_URL}/marketplace/listings/${listingId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Discogs token=${process.env.DISCOGS_API_TOKEN}`,
          'User-Agent': 'PlastikRecordStore/1.0',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          release_id: listing.release.id,
          condition: listing.condition,
          sleeve_condition: listing.sleeve_condition,
          price: listing.price.value,
          comments: listing.comments,
          status: listing.status,
          quantity: newQuantity,
          location: listing.location
        })
      })
      
      let responseData;
      try {
        responseData = await updateResponse.json();
      } catch (e) {
        responseData = await updateResponse.text();
      }
      
      return NextResponse.json({
        success: updateResponse.ok,
        originalQuantity: currentQuantity,
        newQuantity,
        response: responseData,
        status: updateResponse.status
      })
    } else if (action === 'delete') {
      // Test deleting a listing (be careful with this!)
      const deleteResponse = await fetch(`${BASE_URL}/marketplace/listings/${listingId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Discogs token=${process.env.DISCOGS_API_TOKEN}`,
          'User-Agent': 'PlastikRecordStore/1.0'
        }
      })
      
      return NextResponse.json({ 
        success: deleteResponse.ok, 
        status: deleteResponse.status,
        response: await deleteResponse.text()
      })
    }
    
    // Default action is just to test authentication
    return NextResponse.json({ 
      success: true, 
      user: tokenData,
      message: "Authentication successful. Use action=get&id=X or action=update&id=X to test operations."
    })
    
  } catch (error) {
    console.error('Debug Discogs error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}