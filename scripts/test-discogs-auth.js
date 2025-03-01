// Script to verify Discogs API authentication is working
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fetch = require('node-fetch');

async function verifyDiscogsAuthentication() {
  console.log('Verifying Discogs API authentication...');
  
  // Check environment variables
  if (!process.env.DISCOGS_API_TOKEN) {
    console.error('❌ Missing DISCOGS_API_TOKEN environment variable');
    process.exit(1);
  }

  if (!process.env.DISCOGS_USERNAME) {
    console.error('❌ Missing DISCOGS_USERNAME environment variable');
    process.exit(1);
  }
  
  // Check database authentication record
  try {
    console.log('Checking for stored Discogs authentication...');
    const auth = await prisma.discogsAuth.findFirst({
      where: { 
        username: process.env.DISCOGS_USERNAME 
      },
      orderBy: { lastVerified: 'desc' }
    });
    
    if (!auth) {
      console.error('❌ No Discogs authentication found in database');
      console.log('Creating a dummy authentication record for testing...');
      
      await prisma.discogsAuth.create({
        data: {
          username: process.env.DISCOGS_USERNAME,
          accessToken: process.env.DISCOGS_API_TOKEN,
          accessTokenSecret: 'dummy-secret-for-testing',
          lastVerified: new Date()
        }
      });
      
      console.log('✅ Created test authentication record');
    } else {
      console.log(`✅ Found authentication record for ${auth.username}`);
      console.log(`Last verified: ${auth.lastVerified}`);
    }
  } catch (error) {
    console.error('Error checking authentication record:', error);
  }
  
  // Verify identity with Discogs API
  try {
    console.log('Testing Discogs API connectivity...');
    const response = await fetch('https://api.discogs.com/oauth/identity', {
      headers: {
        'Authorization': `Discogs token=${process.env.DISCOGS_API_TOKEN}`,
        'User-Agent': 'PlastikRecordStore/1.0'
      }
    });
    
    if (response.ok) {
      const identity = await response.json();
      console.log('✅ API connection successful!');
      console.log(`Authenticated as: ${identity.username}`);
      console.log(`Consumer name: ${identity.consumer_name}`);
    } else {
      console.error(`❌ API connection failed: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error(errorText);
    }
  } catch (error) {
    console.error('Error connecting to Discogs API:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyDiscogsAuthentication();