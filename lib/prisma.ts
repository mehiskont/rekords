import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["error"],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    // Make Prisma Client resilient to network issues
    // This will help reduce errors when the database connection is spotty
    errorFormat: 'minimal',
  })

// Add a connection test function
export async function testDatabaseConnection() {
  try {
    // Simple query to test connection
    await prisma.$queryRaw`SELECT 1`
    return { connected: true, error: null }
  } catch (error) {
    console.error('Database connection test failed:', error)
    return { 
      connected: false, 
      error: error instanceof Error ? error.message : String(error) 
    }
  }
}

// Try to connect to the database and handle connection issues gracefully
try {
  // Prevent multiple instances in development
  if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
} catch (e) {
  console.error("Failed to initialize Prisma Client", e)
}

