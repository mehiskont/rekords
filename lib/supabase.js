import { createClient } from '@supabase/supabase-js';

// Initialize the Supabase client with env variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Remove any potential ">" character at the end (noticed in your env file)
const cleanKey = supabaseKey.replace('>', '');

// Check if we have the required config
if (!supabaseUrl || !supabaseKey) {
  console.warn(
    'Missing Supabase credentials. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.'
  );
}

// Create and export the client
const supabase = createClient(supabaseUrl, cleanKey);

export default supabase; 