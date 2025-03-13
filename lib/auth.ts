import { PrismaAdapter } from "@auth/prisma-adapter"
import { PrismaClient } from "@prisma/client"
import EmailProvider from "next-auth/providers/email"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"
import { Resend } from "resend"
import bcrypt from "bcryptjs"
import { log } from "./logger"
import { testDatabaseConnection } from "./prisma"

// Reuse the shared PrismaClient instance
import { prisma } from "./prisma"
const resend = new Resend(process.env.RESEND_API_KEY)

// Track if initialization is successful
let adapterInitialized = false
let prismaAdapter

async function initPrismaAdapter() {
  try {
    // Check if we should force fallback mode
    if (process.env.AUTH_FORCE_FALLBACK === 'true') {
      log("AUTH_FORCE_FALLBACK is enabled, skipping database connection", {}, "info")
      return null
    }
    
    // Test database connection before initializing adapter with a short timeout
    const dbStatus = await testDatabaseConnection(2000)
    
    if (dbStatus.connected && !dbStatus.forceFallback) {
      // Create and use adapter when connection is verified
      prismaAdapter = PrismaAdapter(prisma)
      adapterInitialized = true
      log("PrismaAdapter initialized successfully", {}, "info")
      return prismaAdapter
    } else {
      log("Database connection test failed, skipping PrismaAdapter", dbStatus.error, "warn")
      return null
    }
  } catch (error) {
    log("Error initializing PrismaAdapter", error, "error")
    return null
  }
}

// Immediately try to initialize, but don't block startup
initPrismaAdapter().catch(error => {
  log("Error during adapter initialization", error, "error")
})

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
  // Use custom PrismaAdapter with better debugging
  adapter: {
    ...PrismaAdapter(prisma),
    async linkAccount(data) {
      log("Linking account", { provider: data.provider, userId: data.userId }, "info");
      
      // Look for placeholder records to update instead of creating new ones
      try {
        const existingAccount = await prisma.account.findFirst({
          where: { 
            userId: data.userId,
            provider: data.provider,
            providerAccountId: 'placeholder-will-be-updated'
          }
        });
        
        if (existingAccount) {
          log("Found placeholder account to update", { id: existingAccount.id }, "info");
          const updated = await prisma.account.update({
            where: { id: existingAccount.id },
            data: {
              providerAccountId: data.providerAccountId,
              access_token: data.access_token,
              refresh_token: data.refresh_token,
              expires_at: data.expires_at,
              token_type: data.token_type,
              scope: data.scope,
              id_token: data.id_token,
              session_state: data.session_state
            }
          });
          return updated;
        }
      } catch (err) {
        log("Error finding/updating placeholder account", err, "error");
      }
      
      // Default behavior
      return prisma.account.create({ data });
    }
  },
  debug: true, // Enable debug mode temporarily
  session: {
    strategy: "jwt", // Use JWT strategy for better reliability
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
          // Try to authenticate with the database first
          try {
            // Find the user
            const user = await prisma.user.findUnique({
              where: { email: credentials.email }
            });
            
            // If no user or no password (OAuth user), return null
            if (!user || !user.hashedPassword) {
              // For debugging, check if this is our test user
              const testEmail = process.env.TEST_USER_EMAIL || "test@example.com";
              const testPassword = process.env.TEST_USER_PASSWORD || "password123";
              const adminEmail = process.env.ADMIN_USER_EMAIL || "admin@example.com";
              const adminPassword = process.env.ADMIN_USER_PASSWORD || "admin123";
              
              if (credentials.email === testEmail && credentials.password === testPassword) {
                log("Using test user auth as fallback", {}, "info");
                return {
                  id: "temp-user-id-123",
                  email: testEmail,
                  name: "Test User"
                };
              }
              
              // Add admin user fallback
              if (credentials.email === adminEmail && credentials.password === adminPassword) {
                log("Using admin user auth", {}, "info");
                return {
                  id: "admin-user-id-456",
                  email: adminEmail,
                  name: "Admin User" 
                };
              }
              
              return null;
            }
            
            // Check password
            const passwordValid = await bcrypt.compare(credentials.password, user.hashedPassword);
            if (!passwordValid) {
              return null;
            }
            
            // Return authorized user
            log("User authenticated successfully from database", { userId: user.id }, "info");
            return {
              id: user.id,
              email: user.email,
              name: user.name
            };
          } catch (dbError) {
            // Database is unavailable, fallback to test user
            log("Database error during auth, using fallback", dbError, "warn");
            
            // Check if this is our test user
            const testEmail = process.env.TEST_USER_EMAIL || "test@example.com";
            const testPassword = process.env.TEST_USER_PASSWORD || "password123";
            const adminEmail = process.env.ADMIN_USER_EMAIL || "admin@example.com";
            const adminPassword = process.env.ADMIN_USER_PASSWORD || "admin123";
            
            if (credentials.email === testEmail && credentials.password === testPassword) {
              return {
                id: "temp-user-id-123",
                email: testEmail,
                name: "Test User"
              };
            }
            
            // Admin fallback
            if (credentials.email === adminEmail && credentials.password === adminPassword) {
              log("Using admin user auth in fallback", {}, "info");
              return {
                id: "admin-user-id-456",
                email: adminEmail,
                name: "Admin User" 
              };
            }
            
            return null;
          }
        } catch (error) {
          log("Error in credentials authorization:", error, "error");
          return null;
        }
      }
    }),
    // Google OAuth provider with proper configuration
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      },
      // Always use the same profile handling regardless of adapter status
      profile(profile) {
        log("Google auth: processing profile", { email: profile.email }, "info");
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture
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
    // Add signIn callback for handling OAuthAccountNotLinked
    async signIn({ user, account, profile, email }) {
      log("Sign-in attempt:", {
        provider: account?.provider,
        userId: user?.id,
        userEmail: user?.email || email
      }, "info");
      
      // Special handling for Google OAuth users
      if (account?.provider === "google" && profile?.email) {
        try {
          // Try to find an existing user with this email
          const existingUser = await prisma.user.findUnique({
            where: { email: profile.email },
            include: { accounts: true }
          });
          
          if (existingUser) {
            log(`Found existing user for email ${profile.email}`, { userId: existingUser.id }, "info");
            
            // Check if this Google account is already linked to another user
            const existingGoogleAccount = await prisma.account.findFirst({
              where: {
                provider: "google",
                providerAccountId: profile.sub,
              }
            });
            
            if (existingGoogleAccount && existingGoogleAccount.userId !== existingUser.id) {
              log("Google account linked to different user", { 
                linkedUserId: existingGoogleAccount.userId,
                attemptedUserId: existingUser.id 
              }, "warn");
              
              // Special case - try to fix by updating the Account to point to the correct user
              await prisma.account.update({
                where: { id: existingGoogleAccount.id },
                data: { userId: existingUser.id }
              });
              
              log("Updated Google account to link to correct user", {}, "info");
            }
            
            // Check if user has any Google account
            const hasGoogleAccount = existingUser.accounts?.some(a => a.provider === "google");
            
            if (!hasGoogleAccount) {
              log("Creating Google account link for existing user", { userId: existingUser.id }, "info");
              
              // Create the account connection
              await prisma.account.create({
                data: {
                  userId: existingUser.id,
                  type: "oauth",
                  provider: "google",
                  providerAccountId: profile.sub,
                  access_token: account.access_token,
                  refresh_token: account.refresh_token,
                  expires_at: account.expires_at,
                  token_type: account.token_type,
                  scope: account.scope,
                  id_token: account.id_token,
                  session_state: account.session_state
                }
              });
              
              log("Successfully linked Google account to existing user", { userId: existingUser.id }, "info");
            }
          }
        } catch (err) {
          log("Error handling OAuth account linking", err, "error");
        }
      }
      
      return true;
    }
  },
}

