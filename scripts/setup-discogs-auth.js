const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function setupDiscogsAuth() {
  try {
    console.log('Setting up Discogs authentication...');
    
    // Check for existing auth
    const existingAuth = await prisma.discogsAuth.findFirst({
      where: {
        username: process.env.DISCOGS_USERNAME,
      },
    });

    if (existingAuth) {
      console.log('✅ Discogs authentication already exists for', existingAuth.username);
      return;
    }

    // If DISCOGS_SELLER_ACCESS_TOKEN is not set in env, we need to provide it
    if (!process.env.DISCOGS_SELLER_ACCESS_TOKEN || !process.env.DISCOGS_SELLER_ACCESS_TOKEN_SECRET) {
      console.log('❌ Missing DISCOGS_SELLER_ACCESS_TOKEN or DISCOGS_SELLER_ACCESS_TOKEN_SECRET in environment');
      console.log('Please set these values or complete the OAuth flow by visiting /dashboard/settings');
      return;
    }

    // Create a new authentication record
    const newAuth = await prisma.discogsAuth.create({
      data: {
        username: process.env.DISCOGS_USERNAME,
        accessToken: process.env.DISCOGS_SELLER_ACCESS_TOKEN,
        accessTokenSecret: process.env.DISCOGS_SELLER_ACCESS_TOKEN_SECRET,
        lastVerified: new Date(),
      },
    });

    console.log('✅ Created Discogs authentication for', newAuth.username);
    console.log('Please restart your application for changes to take effect');
  } catch (error) {
    console.error('Error setting up Discogs authentication:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setupDiscogsAuth();