import { createClient } from '@supabase/supabase-js';

// Initialize the Supabase admin client with env variables (server-side only)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';

// Check if we're in a build environment
const isBuildProcess = process.env.NODE_ENV === 'production' && process.env.BUILD_DATABASE_FALLBACK === 'true';

// Check if we have the required config
if (!supabaseUrl || !supabaseServiceKey) {
  console.warn(
    'Missing Supabase admin credentials. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables.'
  );
}

// Create a mock client or real client
let supabaseAdmin;
if (isBuildProcess && (!supabaseUrl || !supabaseServiceKey)) {
  // Create a mock client for build process
  supabaseAdmin = {
    from: () => ({
      select: () => ({ data: [], error: null }),
      insert: () => ({ data: null, error: null }),
      update: () => ({ data: null, error: null }),
      delete: () => ({ data: null, error: null }),
      eq: () => ({ data: [], error: null }),
      single: () => ({ data: null, error: null }),
    }),
    auth: {
      admin: {
        createUser: async () => ({ data: { user: null }, error: null }),
      },
    },
  };
  console.warn('Using mock Supabase admin client for build process');
} else {
  // Create and export the admin client with service role permissions
  // This should ONLY be used in server-side code (API routes, server components)
  supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
}

export default supabaseAdmin; 