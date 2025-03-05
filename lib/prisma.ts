import { PrismaClient } from "@prisma/client"
import { log } from './logger'

// Define client with better error handling and fixed database URL
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Create client with direct database URL to avoid env file issues
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["error", "warn"],
    errorFormat: 'minimal',
    datasources: {
      db: {
        url: "postgresql://mehiskont:@localhost:5432/postgres?schema=public"
      }
    }
  })

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

// Try to connect to the database and handle connection issues gracefully
try {
  // Prevent multiple instances in development
  if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
} catch (e) {
  console.error("Failed to initialize Prisma Client", e)
}

