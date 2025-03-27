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

// Add a connection test function with timeout to prevent hanging
export async function testDatabaseConnection(timeout = 3000) {
  return new Promise(async (resolve) => {
    // Set a timeout to avoid hanging if connection takes too long
    const timeoutId = setTimeout(() => {
      console.error('Database connection test timed out after', timeout, 'ms');
      resolve({ 
        connected: false, 
        error: `Connection timed out after ${timeout}ms`,
        hasData: false,
        forceFallback: true
      });
    }, timeout);
    
    try {
      // Simple query to test connection
      await prisma.$queryRaw`SELECT 1 as connected`;
      
      // Check if tables exist
      try {
        const users = await prisma.user.findMany({ take: 1 });
        clearTimeout(timeoutId);
        return resolve({ 
          connected: true, 
          error: null, 
          hasData: users.length > 0,
          details: { tables: { users: users.length > 0 } }
        });
      } catch (tableError) {
        clearTimeout(timeoutId);
        return resolve({ 
          connected: true, 
          error: "Database connected but tables not found", 
          hasData: false,
          forceFallback: true,
          details: { tableError: tableError instanceof Error ? tableError.message : String(tableError) }
        });
      }
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('Database connection test failed:', error);
      return resolve({ 
        connected: false, 
        error: error instanceof Error ? error.message : String(error),
        hasData: false,
        forceFallback: true
      });
    }
  });
}

// Set the client to the global object in development to prevent multiple instances
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma; 