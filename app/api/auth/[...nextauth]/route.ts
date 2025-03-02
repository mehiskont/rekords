import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { PrismaClient } from "@prisma/client"
import EmailProvider from "next-auth/providers/email"
import GoogleProvider from "next-auth/providers/google"

const prisma = new PrismaClient()

// For debug purposes
console.log("NextAuth Configuration:");
console.log(`GOOGLE_CLIENT_ID exists: ${!!process.env.GOOGLE_CLIENT_ID}`);
console.log(`GOOGLE_CLIENT_SECRET exists: ${!!process.env.GOOGLE_CLIENT_SECRET}`);

// Import local Google credentials as fallback
let googleClientId = process.env.GOOGLE_CLIENT_ID;
let googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

try {
  if (!googleClientId || !googleClientSecret) {
    // Try to get from local file if environment variables are missing
    const { GoogleProvider } = require('../../../../components/auth/google-provider');
    googleClientId = GoogleProvider.clientId;
    googleClientSecret = GoogleProvider.clientSecret;
    console.log('Using local Google credentials instead of environment variables');
  }
} catch (error) {
  console.error('Error loading Google credentials:', error);
}

const handler = NextAuth({
  adapter: PrismaAdapter(prisma),
  debug: true, // Enable debugging
  providers: [
    EmailProvider({
      server: {
        host: process.env.EMAIL_SERVER_HOST,
        port: process.env.EMAIL_SERVER_PORT,
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD,
        },
      },
      from: process.env.EMAIL_FROM,
    }),
    GoogleProvider({
      clientId: googleClientId!,
      clientSecret: googleClientSecret!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
  ],
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id
      }
      return session
    },
    // Log auth errors for debugging
    async signIn({ user, account, profile, email, credentials }) {
      console.log("Sign-in attempt:", { user: !!user, account: !!account, profile: !!profile });
      return true;
    }
  },
})

export { handler as GET, handler as POST }

