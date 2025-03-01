// Force delete a Discogs listing - for use when the normal process fails
// Run with: node force-delete-listing.js <listing_id>
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fetch = require('node-fetch');

async function forceDeleteListing() {
  // Get listing ID from command line
  const listingId = process.argv[2];
  if (!listingId) {
    console.error('Please provide a listing ID as argument');
    console.log('Usage: node force-delete-listing.js <listing_id>');
    process.exit(1);
  }

  console.log(`Attempting to force delete Discogs listing: ${listingId}`);
  
  // Try all available methods to delete the listing
  let success = false;
  
  try {
    // Method 1: Using Discogs API Token
    console.log('\n--- Method 1: Using API Token ---');
    const tokenResult = await deleteUsingToken(listingId);
    if (tokenResult) {
      console.log('✅ Successfully deleted using API token');
      success = true;
    } else {
      console.log('❌ Failed to delete using API token');
    }
  } catch (error) {
    console.error('Error in Method 1:', error.message);
  }
  
  if (!success) {
    try {
      // Method 2: Using OAuth from seller account
      console.log('\n--- Method 2: Using OAuth Authentication ---');
      // First check if we have auth in database
      const auth = await prisma.discogsAuth.findFirst({
        where: { username: process.env.DISCOGS_USERNAME },
        orderBy: { lastVerified: 'desc' }
      });
      
      if (auth) {
        console.log(`Found OAuth credentials for ${auth.username}`);
        
        // Import the required crypto and OAuth libraries
        const crypto = require('crypto');
        const OAuth = require('oauth-1.0a');
        
        // Create OAuth instance
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
        
        // Make signed request
        const requestData = {
          url: `https://api.discogs.com/marketplace/listings/${listingId}`,
          method: 'DELETE',
        };
        
        const headers = oauth.toHeader(
          oauth.authorize(requestData, {
            key: auth.accessToken,
            secret: auth.accessTokenSecret,
          }),
        );
        
        console.log('Sending OAuth-authenticated DELETE request...');
        
        const response = await fetch(requestData.url, {
          method: 'DELETE',
          headers: {
            ...headers,
            'User-Agent': 'PlastikRecordStore/1.0',
          },
        });
        
        if (response.ok || response.status === 404) {
          console.log(`✅ Successfully deleted using OAuth (status: ${response.status})`);
          success = true;
        } else {
          const errorText = await response.text();
          console.error(`❌ OAuth deletion failed: ${response.status} - ${errorText}`);
        }
      } else {
        console.log('No OAuth credentials found in database');
      }
    } catch (error) {
      console.error('Error in Method 2:', error.message);
    }
  }
  
  if (!success) {
    try {
      // Method 3: Using direct Discogs seller API
      console.log('\n--- Method 3: Using Discogs Seller API ---');
      
      // Check if we have seller token
      if (process.env.DISCOGS_SELLER_ACCESS_TOKEN) {
        console.log('Using seller access token for deletion...');
        
        const response = await fetch(`https://api.discogs.com/marketplace/listings/${listingId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `OAuth oauth_token=${process.env.DISCOGS_SELLER_ACCESS_TOKEN}`,
            'User-Agent': 'PlastikRecordStore/1.0',
          },
        });
        
        if (response.ok || response.status === 404) {
          console.log(`✅ Successfully deleted using seller token (status: ${response.status})`);
          success = true;
        } else {
          const errorText = await response.text();
          console.error(`❌ Seller token deletion failed: ${response.status} - ${errorText}`);
        }
      } else {
        console.log('No seller access token found in environment');
      }
    } catch (error) {
      console.error('Error in Method 3:', error.message);
    }
  }
  
  console.log('\n--- Final Result ---');
  if (success) {
    console.log(`✅ Successfully deleted listing ${listingId}`);
  } else {
    console.log(`❌ All deletion methods failed for listing ${listingId}`);
  }
  
  await prisma.$disconnect();
}

async function deleteUsingToken(listingId) {
  if (!process.env.DISCOGS_API_TOKEN) {
    console.log('No API token found in environment');
    return false;
  }
  
  console.log('Using API token for deletion...');
  
  // First try to get the listing to see if it exists
  try {
    const getResponse = await fetch(`https://api.discogs.com/marketplace/listings/${listingId}`, {
      headers: {
        'Authorization': `Discogs token=${process.env.DISCOGS_API_TOKEN}`,
        'User-Agent': 'PlastikRecordStore/1.0',
      },
    });
    
    if (getResponse.status === 404) {
      console.log('Listing already deleted or does not exist');
      return true;
    }
    
    if (!getResponse.ok) {
      console.error(`Failed to get listing: ${getResponse.status} ${getResponse.statusText}`);
      return false;
    }
    
    console.log('Listing exists, attempting to delete...');
    
    // Now try to delete
    const deleteResponse = await fetch(`https://api.discogs.com/marketplace/listings/${listingId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Discogs token=${process.env.DISCOGS_API_TOKEN}`,
        'User-Agent': 'PlastikRecordStore/1.0',
      },
    });
    
    if (deleteResponse.ok) {
      return true;
    } else {
      const errorText = await deleteResponse.text();
      console.error(`Delete failed: ${deleteResponse.status} - ${errorText}`);
      return false;
    }
  } catch (error) {
    console.error('Error in token deletion:', error.message);
    return false;
  }
}

forceDeleteListing();