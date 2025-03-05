import { PrismaAdapter } from "@auth/prisma-adapter"
import { PrismaClient } from "@prisma/client"
import EmailProvider from "next-auth/providers/email"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"
import { Resend } from "resend"
import bcrypt from "bcryptjs"
import { log } from "./logger"

// Reuse the shared PrismaClient instance
import { prisma } from "./prisma"
const resend = new Resend(process.env.RESEND_API_KEY)

// Track if initialization is successful
let adapterInitialized = false
let prismaAdapter

try {
  prismaAdapter = PrismaAdapter(prisma)
  adapterInitialized = true
  log("PrismaAdapter initialized successfully", {}, "info")
} catch (error) {
  log("Error initializing PrismaAdapter", error, "error")
  prismaAdapter = null
}

// Helper to check if email provider is configured
function isEmailProviderConfigured() {
  return Boolean(
    process.env.EMAIL_SERVER_HOST &&
    process.env.EMAIL_SERVER_PORT &&
    process.env.EMAIL_SERVER_USER &&
    process.env.EMAIL_SERVER_PASSWORD &&
    process.env.EMAIL_FROM
  )
}

export const authOptions = {
  // Skip adapter due to database connection issues
  adapter: undefined, 
  debug: true, // Enable debug mode temporarily to diagnose issues
  session: {
    strategy: "jwt", // Use JWT strategy to avoid database dependency
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  providers: [
    // Credentials provider for email/password login
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          // Since database is unavailable, let's hardcode a temporary test user
          // IMPORTANT: This is temporary until the database connection is fixed
          log("Database unavailable, using temporary hardcoded auth", {}, "warn");
          
          // Check if this is our test user
          if (credentials.email === "test@example.com" && credentials.password === "password123") {
            return {
              id: "temp-user-id-123",
              email: "test@example.com",
              name: "Test User"
            };
          }
          
          // You could add other test users here if needed
          
          return null;
        } catch (error) {
          log("Error in credentials authorization:", error, "error");
          return null;
        }
      }
    }),
    // Simplified Google provider configuration - database unavailable, so it won't work fully
    // But we'll keep it for UI completeness
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    })
  ],
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  callbacks: {
    async jwt({ token, user, account }) {
      // Initial sign in
      if (account && user) {
        return {
          ...token,
          userId: user.id,
        };
      }
      // Return previous token if the access token has not expired yet
      return token;
    },
    async session({ session, token }) {
      // In JWT strategy, we primarily use token, not user
      // User param may be undefined with JWT strategy
      
      if (session?.user && token) {
        // Set user ID from token (in JWT mode, this is our source of truth)
        if (token.userId) {
          session.user.id = token.userId;
        }
      }
      
      return session;
    },
    // Add signIn callback for debugging
    async signIn({ user, account, profile }) {
      console.log("Sign-in attempt:", {
        provider: account?.provider,
        userId: user?.id,
        userEmail: user?.email
      });
      return true;
    }
  },
}

