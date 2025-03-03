import NextAuth from "next-auth"
import { authOptions } from "@/lib/auth"

// Import the centralized auth configuration from lib/auth.ts
console.log("Using auth configuration from lib/auth.ts")

// Create the NextAuth handler using the centralized config
const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }

