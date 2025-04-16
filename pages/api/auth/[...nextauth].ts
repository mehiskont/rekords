import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'

// Export the NextAuth handler
export default NextAuth(authOptions)