#!/usr/bin/env node

/**
 * Supabase App Starter Script
 * 
 * This script verifies the Supabase connection and then starts the application.
 * It ensures proper configuration before running the app.
 */

const { execSync, spawn } = require('child_process');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '.env.local' });

// Verify Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const databaseUrl = process.env.DATABASE_URL;
const directUrl = process.env.DIRECT_URL;

console.log('🚀 Starting application with Supabase configuration...');

// Check configuration
if (!supabaseUrl || !supabaseKey) {
  console.error('\n❌ Missing Supabase configuration in .env.local');
  console.error('Please make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set');
  process.exit(1);
}

if (!databaseUrl || !directUrl) {
  console.error('\n❌ Missing database configuration in .env.local');
  console.error('Please make sure DATABASE_URL and DIRECT_URL are set');
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// Test connection
async function testSupabaseConnection() {
  try {
    console.log('\n📡 Testing Supabase connection...');
    
    // Try auth service
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error(`\n❌ Supabase auth service error: ${error.message}`);
      return false;
    }
    
    console.log('✅ Supabase auth service is working');

    // Try database connection through API (this will likely fail if table doesn't exist)
    try {
      await supabase.from('mcp_test').select('*').limit(1);
      console.log('✅ Successfully connected to mcp_test table');
    } catch (err) {
      // This may fail if table doesn't exist, which is fine
      console.log('ℹ️ Could not query mcp_test table (this is normal if the table doesn\'t exist)');
    }

    return true;
  } catch (error) {
    console.error('\n❌ Supabase connection test failed', error);
    return false;
  }
}

// Start the Next.js development server
function startNextDev() {
  console.log('\n🚀 Starting Next.js development server...');
  
  const nextDevProcess = spawn('npm', ['run', 'dev'], { 
    stdio: 'inherit', 
    shell: true 
  });
  
  nextDevProcess.on('close', (code) => {
    if (code !== 0) {
      console.error(`\n❌ Next.js development server exited with code ${code}`);
    }
  });
  
  // Handle termination signals
  process.on('SIGINT', () => {
    nextDevProcess.kill('SIGINT');
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    nextDevProcess.kill('SIGTERM');
    process.exit(0);
  });
}

// Main function
async function main() {
  const connectionSuccess = await testSupabaseConnection();
  
  if (!connectionSuccess) {
    console.error('\n❌ Could not connect to Supabase. Please check your configuration.');
    console.log('\nTroubleshooting tips:');
    console.log('1. Make sure the Supabase project is running and accessible');
    console.log('2. Verify the URL and API key in .env.local');
    console.log('3. Check if your IP is allowed to access the Supabase project');
    
    const startAnyway = process.argv.includes('--force');
    
    if (!startAnyway) {
      console.log('\nTo start anyway, run with --force flag:');
      console.log('node start-supabase.js --force');
      process.exit(1);
    }
    
    console.log('\n⚠️ Starting anyway as requested (--force)');
  }
  
  // Generate Prisma client to ensure it's up to date
  try {
    console.log('\n🔄 Generating Prisma client...');
    execSync('npx prisma generate', { stdio: 'inherit' });
    console.log('✅ Prisma client generated successfully');
  } catch (error) {
    console.error('\n❌ Failed to generate Prisma client', error);
    console.log('⚠️ Continuing anyway, but you may encounter database errors');
  }
  
  // Start Next.js development server
  startNextDev();
}

// Run the main function
main().catch(error => {
  console.error('\n❌ Error starting application', error);
  process.exit(1);
});