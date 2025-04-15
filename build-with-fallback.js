#!/usr/bin/env node

// Force fallback database mode during build
process.env.BUILD_DATABASE_FALLBACK = 'true';

// // Set dummy Supabase values if they don't exist
// if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
//   process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://dummy-build-url.supabase.co';
// }
// if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
//   process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'dummy-build-key';
// }

// Import Next.js build and run it
const { build } = require('next/dist/build');

// Run the build
build(process.cwd(), { 
  env: {
    BUILD_DATABASE_FALLBACK: 'true',
    // NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    // NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
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

const { execSync } = require('child_process');
const path = require('path');

console.log('Starting build process with fallback...');

// Check for necessary build variables (example)
if (!process.env.NEXT_PUBLIC_API_URL) {
  console.warn('WARNING: NEXT_PUBLIC_API_URL is not set. Using default.');
  process.env.NEXT_PUBLIC_API_URL = 'http://localhost:4000'; // Example default
}

function getEnvVariables() {
  const env = {
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
  };

  console.log('Loaded environment variables:');
  console.log(`  NEXT_PUBLIC_API_URL: ${process.env.NEXT_PUBLIC_API_URL}`);
  console.log(`  DATABASE_URL: ${process.env.DATABASE_URL ? '******' : 'Not Set'}`);
  console.log(`  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: ${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? '******' : 'Not Set'}`);
  console.log('---');
  return env;
}

try {
  console.log('Running standard build command: next build');
  execSync('next build', { stdio: 'inherit' });
  console.log('Build completed successfully.');
} catch (error) {
  console.error('Build failed:', error.message);
  console.error('Build command output (if any):', error.stdout?.toString());
  console.error('Build command error output (if any):', error.stderr?.toString());
  process.exit(1);
}