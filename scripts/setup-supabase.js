#!/usr/bin/env node

/**
 * Supabase Setup Script
 * 
 * This script helps set up your Supabase project for use with this application.
 * It validates your connection, applies schema migrations, and creates necessary initial data.
 */

const dotenv = require('dotenv');
const { execSync } = require('child_process');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Load environment variables from .env.supabase
dotenv.config({ path: '.env.supabase' });

// Check if Supabase URL and key exist
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const directUrl = process.env.DIRECT_URL;

// Validate required environment variables
if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials. Please update .env.supabase file with:');
  console.error('  - NEXT_PUBLIC_SUPABASE_URL');
  console.error('  - NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

if (!directUrl) {
  console.error('❌ Missing DIRECT_URL in .env.supabase file');
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// Helper function to ask questions
function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Apply database migrations
async function applyMigrations() {
  console.log('\n🔄 Applying database migrations...');
  
  try {
    // Run Prisma migration using the Supabase schema
    execSync('npx prisma db push --schema=./prisma/schema.supabase.prisma --accept-data-loss', { stdio: 'inherit' });
    console.log('✅ Database migrations applied successfully!');
    return true;
  } catch (error) {
    console.error('❌ Failed to apply migrations:', error.message);
    console.log('You may need to manually fix any issues and try again.');
    return false;
  }
}

// Create admin user
async function createAdminUser() {
  console.log('\n👤 Creating admin user...');
  
  // Get user input for admin credentials
  const email = await askQuestion('Enter admin email: ');
  const name = await askQuestion('Enter admin name: ');
  const password = await askQuestion('Enter admin password (min 8 characters): ');
  
  if (!email.includes('@') || password.length < 8) {
    console.error('❌ Invalid email or password (must be at least 8 characters)');
    return false;
  }
  
  try {
    // Try to create user with Supabase Auth (if available)
    console.log('Attempting to create user via Supabase Auth...');
    const { data: authUser, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          role: 'admin'
        }
      }
    });
    
    if (authError) {
      console.warn(`⚠️ Could not create user with Supabase Auth: ${authError.message}`);
      console.log('Falling back to direct database insertion...');
    } else {
      console.log('✅ User created in Supabase Auth successfully!');
    }
    
    // Insert user directly into database
    const { data, error } = await supabase
      .from('users')
      .upsert([
        {
          email,
          name,
          role: 'admin',
          // Note: In a production app, you should hash this password
          // This is just for demo/setup purposes
          hashedPassword: Buffer.from(password).toString('base64'), // Simple encoding (NOT secure)
          needsProfile: false
        }
      ])
      .select();
    
    if (error) {
      console.error('❌ Failed to create admin user in database:', error.message);
      return false;
    } else {
      console.log('✅ Admin user created successfully in the database!');
      console.log(`   Email: ${email}`);
      console.log(`   Name: ${name}`);
      console.log(`   Role: admin`);
      
      // Warn about password hashing
      console.log('\n⚠️ IMPORTANT: The password is stored with basic encoding for this demo.');
      console.log('   In production, you should implement proper password hashing!');
      return true;
    }
  } catch (error) {
    console.error('❌ Failed to create admin user:', error.message);
    return false;
  }
}

// Main function
async function main() {
  try {
    console.log('🚀 Starting Supabase setup...');
    
    // Step 1: Test connection
    console.log('\n📡 Testing Supabase connection...');
    try {
      // Try a simple query that will likely fail, but in a controlled way
      const { data, error } = await supabase.from('_unused_').select('*').limit(1);
      
      if (data) {
        console.log('✅ Supabase connection successful!');
      } else if (error) {
        // Expected to fail with PGRST116 or relation does not exist - which actually means the connection is working
        if (error.code === 'PGRST116' || error.message.includes('relation') || error.message.includes('does not exist')) {
          console.log('✅ Supabase connection successful! (Expected error about table not existing)');
        } else {
          console.error(`❌ Connection error: ${error.message}`);
          rl.close();
          process.exit(1);
        }
      }
    } catch (error) {
      console.error('❌ Connection test failed:', error.message || error);
      rl.close();
      process.exit(1);
    }
    
    // Step 2: Ask if user wants to apply migrations
    const migrateAnswer = await askQuestion('\n⚠️ Would you like to apply database migrations to Supabase? This will create all tables. (y/N): ');
    let migrationsApplied = false;
    
    if (migrateAnswer.toLowerCase() === 'y') {
      migrationsApplied = await applyMigrations();
    } else {
      console.log('Skipping migrations. You can run them manually with:');
      console.log('npx prisma db push --schema=./prisma/schema.supabase.prisma');
    }
    
    // Step 3: Ask if user wants to create an admin user
    const adminAnswer = await askQuestion('\n👤 Would you like to create an admin user? (y/N): ');
    
    if (adminAnswer.toLowerCase() === 'y') {
      if (!migrationsApplied) {
        console.log('\n⚠️ Warning: Creating a user without applying migrations may fail if tables don\'t exist.');
        const proceedAnswer = await askQuestion('Do you want to proceed anyway? (y/N): ');
        
        if (proceedAnswer.toLowerCase() === 'y') {
          await createAdminUser();
        } else {
          console.log('Skipping admin user creation.');
        }
      } else {
        await createAdminUser();
      }
    } else {
      console.log('Skipping admin user creation.');
    }
    
    console.log('\n🎉 Supabase setup complete!');
    rl.close();
  } catch (error) {
    console.error('\n❌ Supabase setup failed:', error);
    rl.close();
    process.exit(1);
  }
}

// Run the main function
main().catch((error) => {
  console.error('❌ Supabase setup failed:', error);
  rl.close();
  process.exit(1);
});