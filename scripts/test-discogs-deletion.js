// Script to test direct Discogs listing deletion using the API token
// Run with: node scripts/test-discogs-deletion.js <listing_id>

require('dotenv').config();

// Listing ID to test (replace with your actual listing ID or pass as argument)
const listingId = process.argv[2] || "3478567482";

async function removeDiscogsListing(listingId) {
  const baseUrl = "https://api.discogs.com";
  const token = process.env.DISCOGS_API_TOKEN;
  
  if (!token) {
    console.error("Missing DISCOGS_API_TOKEN in environment variables");
    return false;
  }
  
  console.log(`Attempting to remove Discogs listing ${listingId}...`);
  
  try {
    // Try to get the listing first to make sure it exists
    console.log("Checking if listing exists...");
    const checkResponse = await fetch(`${baseUrl}/marketplace/listings/${listingId}`, {
      headers: {
        'Authorization': `Discogs token=${token}`,
        'User-Agent': 'RecordStore/1.0'
      }
    });
    
    if (checkResponse.status === 404) {
      console.log(`Listing ${listingId} not found (404) - might already be deleted`);
      return true;
    }
    
    if (!checkResponse.ok) {
      const errorText = await checkResponse.text();
      console.error(`Failed to check listing ${listingId}: ${checkResponse.status} - ${errorText}`);
      return false;
    }
    
    const listing = await checkResponse.json();
    console.log(`Found listing: "${listing.release.description}" priced at ${listing.price.value} ${listing.price.currency}`);
    
    // Now try to delete it
    console.log(`Deleting listing ${listingId}...`);
    const deleteResponse = await fetch(`${baseUrl}/marketplace/listings/${listingId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Discogs token=${token}`,
        'User-Agent': 'RecordStore/1.0'
      }
    });
    
    if (deleteResponse.status === 204) {
      console.log(`✅ Successfully deleted listing ${listingId} (Status 204 No Content)`);
      return true;
    }
    
    if (!deleteResponse.ok) {
      const errorText = await deleteResponse.text();
      console.error(`Failed to delete listing ${listingId}: ${deleteResponse.status} - ${errorText}`);
      return false;
    }
    
    console.log(`✅ Successfully deleted listing ${listingId}`);
    return true;
  } catch (error) {
    console.error(`Error removing Discogs listing ${listingId}:`, error);
    return false;
  }
}

async function main() {
  console.log("Testing Discogs listing deletion...");
  console.log(`Using DISCOGS_API_TOKEN: ${process.env.DISCOGS_API_TOKEN ? "Present (hidden)" : "Missing!"}`);
  
  const result = await removeDiscogsListing(listingId);
  console.log(`\nOverall result: ${result ? "SUCCESS" : "FAILED"}`);
}

main()
  .catch(err => {
    console.error("Unhandled error:", err);
    process.exit(1);
  });