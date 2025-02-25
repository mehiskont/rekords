const dotenv = require("dotenv")
const { PrismaClient } = require("@prisma/client")

dotenv.config({ path: ".env.local" })

const prisma = new PrismaClient()

async function main() {
  try {
    console.log("Environment variables:")
    console.log("DATABASE_URL:", process.env.DATABASE_URL)
    console.log("NEXT_PUBLIC_SUPABASE_URL:", process.env.NEXT_PUBLIC_SUPABASE_URL)
    console.log("NEXT_PUBLIC_SUPABASE_ANON_KEY:", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

    console.log("Attempting to connect with URL:", process.env.DATABASE_URL)
    const result = await prisma.$queryRaw`SELECT NOW() as current_time`
    console.log("Database connection successful:", result)
  } catch (error) {
    console.error("Database connection failed:", error)
  } finally {
    await prisma.$disconnect()
  }
}

main()

