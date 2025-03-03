import { NextResponse } from 'next/server'
import { testDatabaseConnection } from '@/lib/prisma'

export async function GET() {
  const status = await testDatabaseConnection()
  
  return NextResponse.json({
    status: status.connected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
    error: status.error
  })
}