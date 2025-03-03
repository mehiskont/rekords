'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error)
  }, [error])

  const isPrismaError = error.message.includes('prisma') || 
                        error.message.includes('database') ||
                        error.message.includes('PrismaClient') ||
                        error.message.toLowerCase().includes("can't reach database")
  
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-4 text-center">
      <div className="space-y-4 max-w-md">
        <h2 className="text-2xl font-bold tracking-tight">Something went wrong!</h2>
        
        {isPrismaError ? (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-900 p-6">
            <p className="text-yellow-800 dark:text-yellow-400">
              We're having trouble connecting to our database at the moment.
            </p>
            <p className="text-yellow-700 dark:text-yellow-500 text-sm mt-2">
              Please try refreshing the page or come back later.
            </p>
          </div>
        ) : (
          <p className="text-muted-foreground">
            An unexpected error occurred. Our team has been notified.
          </p>
        )}
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-6">
          <Button onClick={() => reset()}>
            Try again
          </Button>
          <Button variant="outline" asChild>
            <Link href="/">
              Return to home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

