import { NextResponse } from 'next/server';
import supabase from '../../../lib/supabase';
import { db } from '../../../lib/database';

export async function GET() {
  try {
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
    
    // Fallback to direct Supabase test if db helper fails
    try {
      const { data, error: supabaseError } = await supabase.from('users').select('count');
      
      if (supabaseError) {
        return NextResponse.json(
          { success: false, error: supabaseError.message },
          { status: 500 }
        );
      }
      
      return NextResponse.json({ 
        success: true, 
        message: 'Supabase connection successful (direct)',
        data
      });
    } catch (supabaseError) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Both database connection methods failed',
          primaryError: error.message,
          supabaseError: supabaseError.message
        },
        { status: 500 }
      );
    }
  }
} 