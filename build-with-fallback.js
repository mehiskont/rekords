#!/usr/bin/env node

// Force fallback database mode during build
process.env.BUILD_DATABASE_FALLBACK = 'true';

// Set dummy Supabase values if they don't exist
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://dummy-build-url.supabase.co';
}
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'dummy-build-key';
}

// Import Next.js build and run it
const { build } = require('next/dist/build');

// Run the build
build(process.cwd(), { 
  env: {
    BUILD_DATABASE_FALLBACK: 'true',
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  } 
})
.then(() => {
  console.log('Build completed successfully with database fallbacks enabled.');
  process.exit(0);
})
.catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});