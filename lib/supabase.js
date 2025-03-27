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

// Check if we're in a build environment
const isBuildProcess = process.env.NODE_ENV === 'production' && process.env.BUILD_DATABASE_FALLBACK === 'true';

// Create a mock client for build processes when credentials are missing
let supabase;
if (isBuildProcess && (!supabaseUrl || !supabaseKey)) {
  // Create a mock client for build process
  supabase = {
    from: () => ({
      select: () => ({ data: [], error: null }),
      insert: () => ({ data: null, error: null }),
      update: () => ({ data: null, error: null }),
      delete: () => ({ data: null, error: null }),
      eq: () => ({ data: [], error: null }),
      single: () => ({ data: null, error: null }),
    }),
    auth: {
      signUp: async () => ({ user: null, error: null }),
      signIn: async () => ({ user: null, error: null }),
      signOut: async () => ({ error: null }),
    },
  };
  console.warn('Using mock Supabase client for build process');
} else {
  // Create real client
  supabase = createClient(supabaseUrl, cleanKey);
}

export default supabase; 