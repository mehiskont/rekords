import { createClient } from '@supabase/supabase-js';

// Initialize the Supabase admin client with env variables (server-side only)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';

// Check if we have the required config
if (!supabaseUrl || !supabaseServiceKey) {
  console.warn(
    'Missing Supabase admin credentials. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables.'
  );
}

// Create and export the admin client with service role permissions
// This should ONLY be used in server-side code (API routes, server components)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export default supabaseAdmin; 