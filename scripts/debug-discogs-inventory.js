// Debug Discogs inventory updates
// Run with: node scripts/debug-discogs-inventory.js

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// We need to use dynamic imports for ESM modules
let updateDiscogsInventory, removeFromDiscogsInventory, deleteDiscogsListing;

async function loadModules() {
  const discogs = await import('../lib/discogs.js');
  const discogsSeller = await import('../lib/discogs-seller.js');
  
  updateDiscogsInventory = discogs.updateDiscogsInventory;
  removeFromDiscogsInventory = discogs.removeFromDiscogsInventory;
  deleteDiscogsListing = discogsSeller.deleteDiscogsListing;
}

async function main() {
  console.log("Debugging Discogs inventory updates...");
  
  // Load the modules first
  await loadModules();
  
  // 1. Check recent orders with items and their discogs IDs
  const orders = await prisma.order.findMany({
    include: {
      items: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  
  console.log("\n=== Recent Orders with Discogs IDs ===");
  const discogsIds = [];
  
  for (const order of orders) {
    console.log(`Order ${order.id} (${order.createdAt.toISOString()})`);
    console.log(`  - Status: ${order.status}`);
    
    for (const item of order.items) {
      console.log(`    - Item: ${item.title} (Discogs ID: ${item.discogsId})`);
      discogsIds.push(item.discogsId);
    }
  }
  
  // 2. Try to update inventory for recent items with different methods
  console.log("\n=== Testing Discogs Inventory Update Methods ===");
  
  for (const discogsId of discogsIds) {
    console.log(`\nTesting inventory update for listing ${discogsId}:`);
    
    // Method 1: Try the main updateDiscogsInventory function
    console.log("\n1. Testing main updateDiscogsInventory function:");
    try {
      console.log("  Starting update...");
      const result = await updateDiscogsInventory(discogsId);
      console.log(`  Result: ${result ? "Success" : "Failed"}`);
    } catch (err) {
      console.log(`  Error: ${err.message}`);
    }
    
    // Method 2: Try direct OAuth deletion
    console.log("\n2. Testing direct OAuth deletion:");
    try {
      console.log("  Starting OAuth deletion...");
      const result = await deleteDiscogsListing(discogsId);
      console.log(`  Result: ${result ? "Success" : "Failed"}`);
    } catch (err) {
      console.log(`  Error: ${err.message}`);
    }
    
    // Method 3: Try token-based removal
    console.log("\n3. Testing token-based removal:");
    try {
      console.log("  Starting token-based removal...");
      const result = await removeFromDiscogsInventory(discogsId);
      console.log(`  Result: ${result ? "Success" : "Failed"}`);
    } catch (err) {
      console.log(`  Error: ${err.message}`);
    }
  }
  
  // 3. Check Discogs authentication status
  console.log("\n=== Discogs Authentication Status ===");
  
  try {
    const auth = await prisma.discogsAuth.findUnique({
      where: { username: process.env.DISCOGS_USERNAME }
    });
    
    if (auth) {
      console.log(`Found Discogs auth for ${auth.username}`);
      console.log(`Last verified: ${auth.lastVerified.toISOString()}`);
      console.log(`Access token exists: ${!!auth.accessToken}`);
      console.log(`Access token secret exists: ${!!auth.accessTokenSecret}`);
      
      // Check if token needs verification
      const needsVerification = auth.lastVerified < new Date(Date.now() - 24 * 60 * 60 * 1000);
      console.log(`Token needs verification: ${needsVerification}`);
    } else {
      console.log("No Discogs authentication found in database");
    }
    
    // Check environment variables
    console.log("\nEnvironment variables:");
    console.log(`DISCOGS_USERNAME: ${process.env.DISCOGS_USERNAME ? "Set" : "Not set"}`);
    console.log(`DISCOGS_API_TOKEN: ${process.env.DISCOGS_API_TOKEN ? "Set" : "Not set"}`);
    console.log(`DISCOGS_CONSUMER_KEY: ${process.env.DISCOGS_CONSUMER_KEY ? "Set" : "Not set"}`);
    console.log(`DISCOGS_CONSUMER_SECRET: ${process.env.DISCOGS_CONSUMER_SECRET ? "Set" : "Not set"}`);
  } catch (err) {
    console.log(`Error checking Discogs auth: ${err.message}`);
  }
}

main()
  .catch(e => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });