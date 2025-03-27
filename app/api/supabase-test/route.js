import { NextResponse } from 'next/server';
import supabase from '../../../lib/supabase';

export async function GET() {
  try {
    // Simple test query to check connection
    const { data, error } = await supabase.from('users').select('count');
    
    if (error) {
      console.error('Supabase connection error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Supabase connection successful',
      data
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
} 