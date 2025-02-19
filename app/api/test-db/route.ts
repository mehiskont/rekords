import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    // Test the database connection
    await prisma.$connect()

    // Create a test user
    const user = await prisma.user.create({
      data: {
        email: "test@example.com",
        name: "Test User",
      },
    })

    // Delete the test user
    await prisma.user.delete({
      where: {
        id: user.id,
      },
    })

    return NextResponse.json({ status: "Database connection successful" })
  } catch (error) {
    console.error("Database connection error:", error)
    return NextResponse.json({ error: "Failed to connect to the database" }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}

