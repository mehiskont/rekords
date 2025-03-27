import { PrismaClient } from '@prisma/client';

// Use a global variable to prevent multiple instances in development
const globalForPrisma = globalThis;

// Check if we're in a build environment
const isBuildProcess = process.env.NODE_ENV === 'production' && process.env.BUILD_DATABASE_FALLBACK === 'true';

// Initialize Prisma Client
export const prisma = globalForPrisma.prisma || 
  new PrismaClient({
    log: ['error'],
    errorFormat: 'pretty',
  });

// Helper function to check if Prisma can connect to the database
export async function isPrismaConnected() {
  // Skip connection check during build to prevent failures
  if (isBuildProcess) {
    return false;
  }
  
  try {
    // Try a simple query to check connection
    await prisma.$queryRaw`SELECT 1 as connected`;
    return true;
  } catch (error) {
    console.warn('Prisma database connection failed:', error.message);
    return false;
  }
}

// Set the client to the global object in development to prevent multiple instances
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma; 