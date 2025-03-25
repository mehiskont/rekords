#!/usr/bin/env node

/**
 * Simple Supabase Connection Test
 */

const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables from .env.supabase
dotenv.config({ path: '.env.supabase' });

// Check if Supabase URL and key exist
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const directUrl = process.env.DIRECT_URL;

console.log('Supabase URL:', supabaseUrl);
console.log('Anon Key:', supabaseKey ? 'Configured ✅' : 'Missing ❌');
console.log('Direct URL:', directUrl ? 'Configured ✅' : 'Missing ❌');

// Validate required environment variables
if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials. Please update .env.supabase file');
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// Main function
async function main() {
  console.log('\n🔍 Testing Supabase connection...');
  
  try {
    // Try a simple query
    const { data, error } = await supabase.from('_unused_').select('*').limit(1);
    
    if (data) {
      console.log('✅ Supabase connection successful!');
    } else if (error) {
      // Expected to fail with relation does not exist - which actually means connection is working
      if (error.code === 'PGRST116' || error.message.includes('relation') || error.message.includes('does not exist')) {
        console.log('✅ Supabase connection successful! (Expected error about table not existing)');
      } else {
        console.error(`❌ Connection error: ${error.message}`);
        process.exit(1);
      }
    }
    
    // Check auth service
    const { data: authData, error: authError } = await supabase.auth.getSession();
    if (authError) {
      console.log('⚠️ Auth service test returned an error:', authError.message);
    } else {
      console.log('✅ Auth service is working!');
    }
    
    console.log('\n📊 Supabase configuration summary:');
    console.log('- API Connectivity: ✅ Working');
    console.log('- Auth Service: ' + (authError ? '⚠️ Error' : '✅ Working'));
    console.log('- Database URL: ' + (directUrl ? '✅ Configured' : '❌ Missing'));
    
    console.log('\n🎉 Setup complete! Your Supabase instance is ready for use.');
    console.log('\nNext steps:');
    console.log('1. Run migrations: npm run supabase:schema');
    console.log('2. Create admin user through Supabase dashboard');
    console.log('3. Update your application to use Supabase');
    
  } catch (error) {
    console.error('❌ Connection test failed:', error.message || error);
    process.exit(1);
  }
}

// Run the main function
main().catch((error) => {
  console.error('❌ Supabase setup failed:', error);
  process.exit(1);
});