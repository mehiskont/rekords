import { NextResponse } from 'next/server';
import { db } from '../../../lib/database';

export async function GET() {
  try {
    // Check if Supabase credentials are available
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing Supabase credentials',
        requiredEnvVars: [
          'NEXT_PUBLIC_SUPABASE_URL', 
          'NEXT_PUBLIC_SUPABASE_ANON_KEY'
        ],
        envValues: {
          NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'MISSING',
          NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'MISSING',
        }
      }, { status: 500 });
    }
    
    // Try using our database helper that handles fallbacks
    const users = await db.getUsers();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Database connection successful',
      data: {
        userCount: users.length,
        connectionType: users._connectionType || 'supabase'
      }
    });
  } catch (error) {
    console.error('Database connection error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Database connection failed',
        message: error.message
      },
      { status: 500 }
    );
  }
} 