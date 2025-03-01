// Script to test Discogs listing deletion
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Manually test Discogs deletion by listing ID
async function testDeleteDiscogs() {
  if (!process.argv[2]) {
    console.log('Usage: node test-discogs-delete.js <discogs_listing_id>');
    process.exit(1);
  }
  
  const listingId = process.argv[2];
  console.log(`Testing deletion of Discogs listing: ${listingId}`);
  
  try {
    // 1. First try the OAuth method from discogs-seller.ts
    const discogsSellerModule = require('../lib/discogs-seller');
    console.log('Attempting deletion using OAuth seller authentication...');
    
    try {
      const result = await discogsSellerModule.deleteDiscogsListing(listingId);
      console.log(`OAuth deletion result: ${result ? 'Success' : 'Failed'}`);
      if (result) {
        console.log('✅ Successfully deleted listing using OAuth method');
        process.exit(0);
      }
    } catch (error) {
      console.error('Error using OAuth method:', error.message);
      console.log('Trying alternative method...');
    }
    
    // 2. Try token-based method
    console.log('Attempting deletion using API token...');
    
    const fetch = require('node-fetch');
    const url = `https://api.discogs.com/marketplace/listings/${listingId}`;
    
    const deleteResponse = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Discogs token=${process.env.DISCOGS_API_TOKEN}`,
        'User-Agent': 'PlastikRecordStore/1.0',
      },
    });
    
    if (deleteResponse.ok) {
      console.log('✅ Successfully deleted listing using token method');
      process.exit(0);
    } else {
      const errorText = await deleteResponse.text();
      console.error(`Failed to delete listing: ${deleteResponse.status} - ${errorText}`);
      process.exit(1);
    }
  } catch (error) {
    console.error('Unexpected error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testDeleteDiscogs();