import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    // Test the database connection
    console.log("Attempting database connection...")
    await prisma.$connect()
    console.log("Connection successful")

    // Create a test user
    const user = await prisma.user.create({
      data: {
        email: `test-${Date.now()}@example.com`,
        name: "Test User",
      },
    })
    console.log("Test user created:", user.id)

    // Delete the test user
    await prisma.user.delete({
      where: {
        id: user.id,
      },
    })
    console.log("Test user deleted")

    return NextResponse.json({ status: "Database connection successful" })
  } catch (error) {
    console.error("Database connection error:", {
      name: error.name,
      message: error.message,
      code: error.code,
      meta: error.meta,
    })
    return NextResponse.json(
      {
        error: "Failed to connect to the database",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  } finally {
    await prisma.$disconnect()
  }
}

