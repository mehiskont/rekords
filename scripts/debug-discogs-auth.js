// Script to verify and fix Discogs authentication
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fetch = require('node-fetch');
const crypto = require('crypto');
const OAuth = require('oauth-1.0a');

// Create OAuth instance for Discogs
const oauth = new OAuth({
  consumer: {
    key: process.env.DISCOGS_CONSUMER_KEY,
    secret: process.env.DISCOGS_CONSUMER_SECRET,
  },
  signature_method: 'HMAC-SHA1',
  hash_function(base_string, key) {
    return crypto.createHmac('sha1', key).update(base_string).digest('base64');
  },
});

async function debugDiscogsAuth() {
  console.log('Debugging Discogs authentication...');
  
  // Check environment variables
  console.log('\n=== Checking Environment Variables ===');
  
  const requiredVars = [
    'DISCOGS_API_TOKEN',
    'DISCOGS_USERNAME',
    'DISCOGS_CONSUMER_KEY',
    'DISCOGS_CONSUMER_SECRET'
  ];
  
  let missingVars = false;
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      console.error(`❌ Missing ${varName} environment variable`);
      missingVars = true;
    } else {
      console.log(`✅ ${varName} is set`);
    }
  }
  
  if (missingVars) {
    console.error('Please add the missing environment variables to your .env file');
    process.exit(1);
  }
  
  // Check database OAuth credentials
  console.log('\n=== Checking Database OAuth Credentials ===');
  
  const auth = await prisma.discogsAuth.findFirst({
    where: { username: process.env.DISCOGS_USERNAME },
    orderBy: { lastVerified: 'desc' }
  });
  
  if (!auth) {
    console.error(`❌ No Discogs auth found in database for ${process.env.DISCOGS_USERNAME}`);
    console.log('Creating a test auth record...');
    
    const newAuth = await prisma.discogsAuth.create({
      data: {
        username: process.env.DISCOGS_USERNAME,
        accessToken: process.env.DISCOGS_API_TOKEN,
        accessTokenSecret: 'test_token_secret',
        lastVerified: new Date()
      }
    });
    
    console.log(`✅ Created test auth record with ID: ${newAuth.id}`);
  } else {
    console.log(`✅ Found auth record for ${auth.username}`);
    console.log(`Last verified: ${auth.lastVerified}`);
    console.log(`Access token: ${auth.accessToken.substring(0, 5)}...`);
    
    // Test the token with OAuth
    try {
      const requestData = {
        url: 'https://api.discogs.com/oauth/identity',
        method: 'GET',
      };
      
      const headers = oauth.toHeader(
        oauth.authorize(requestData, {
          key: auth.accessToken,
          secret: auth.accessTokenSecret,
        }),
      );
      
      console.log('\nTesting OAuth token...');
      const response = await fetch(requestData.url, {
        headers: {
          ...headers,
          'User-Agent': 'PlastikRecordStore/1.0',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ OAuth token works! Authenticated as: ${data.username}`);
      } else {
        console.error(`❌ OAuth token verification failed (${response.status}): ${response.statusText}`);
        
        // Update auth record with API token values
        console.log('Updating auth record with API token...');
        
        const updatedAuth = await prisma.discogsAuth.update({
          where: { id: auth.id },
          data: {
            accessToken: process.env.DISCOGS_API_TOKEN,
            lastVerified: new Date()
          }
        });
        
        console.log(`✅ Updated auth record with API token`);
      }
    } catch (error) {
      console.error('❌ Error testing OAuth token:', error.message);
    }
  }
  
  // Test API token
  console.log('\n=== Testing API Token ===');
  
  try {
    const response = await fetch('https://api.discogs.com/oauth/identity', {
      headers: {
        'Authorization': `Discogs token=${process.env.DISCOGS_API_TOKEN}`,
        'User-Agent': 'PlastikRecordStore/1.0',
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ API token works! Authenticated as: ${data.username}`);
    } else {
      console.error(`❌ API token verification failed (${response.status}): ${response.statusText}`);
    }
  } catch (error) {
    console.error('❌ Error testing API token:', error.message);
  }
  
  // Test listing deletion rights
  console.log('\n=== Testing Listing Deletion Rights ===');
  
  // Create a test listing
  console.log('(This would create and then delete a test listing, skipping for safety)');
  console.log('To test listing deletion, run:');
  console.log('  node scripts/create-test-order.js <discogs_listing_id>');
  
  await prisma.$disconnect();
}

debugDiscogsAuth();