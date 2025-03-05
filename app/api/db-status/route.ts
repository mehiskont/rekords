import { NextResponse } from 'next/server'
import { testDatabaseConnection } from '@/lib/prisma'

// Add a cache for the status to prevent too many database checks
let statusCache = {
  status: 'unknown',
  timestamp: new Date().toISOString(),
  error: null,
  details: {},
  expiry: 0
};

// Cache duration of 30 seconds
const CACHE_DURATION = 30 * 1000;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const forceCheck = url.searchParams.get('force') === 'true';
  
  // Check if we are forcing fallback mode
  if (process.env.AUTH_FORCE_FALLBACK === 'true') {
    return NextResponse.json({
      status: 'disconnected',
      timestamp: new Date().toISOString(),
      error: 'Auth fallback mode is forced by environment variable',
      forceFallback: true,
      cached: false
    });
  }
  
  // Check if we have a valid cached status
  const now = Date.now();
  if (!forceCheck && statusCache.expiry > now) {
    return NextResponse.json({
      ...statusCache,
      cached: true
    });
  }
  
  // Get fresh status with short timeout to avoid hanging the request
  const status = await testDatabaseConnection(2000);
  
  // Update the cache
  statusCache = {
    status: status.connected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
    error: status.error,
    details: status.details || {},
    expiry: now + CACHE_DURATION
  };
  
  return NextResponse.json({
    ...statusCache,
    cached: false,
    forceFallback: status.forceFallback
  });
}