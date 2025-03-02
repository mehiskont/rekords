import { PrismaAdapter } from "@auth/prisma-adapter"
import { PrismaClient } from "@prisma/client"
import EmailProvider from "next-auth/providers/email"
import GoogleProvider from "next-auth/providers/google"
import { Resend } from "resend"

const prisma = new PrismaClient()
const resend = new Resend(process.env.RESEND_API_KEY)

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    EmailProvider({
      // Use Resend to send emails
      async sendVerificationRequest({ identifier, url }) {
        try {
          await resend.emails.send({
            from: "Plastik Records <auth@plastikrecords.com>",
            to: [identifier],
            subject: "Sign in to Plastik Records",
            html: `
              <div>
                <h1>Sign in to Plastik Records</h1>
                <p>Click the link below to sign in to your account:</p>
                <a href="${url}">Sign in</a>
                <p>If you didn't request this email, you can safely ignore it.</p>
              </div>
            `,
          })
        } catch (error) {
          console.error("Error sending verification email:", error)
          throw new Error("Failed to send verification email")
        }
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
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
  },
}

