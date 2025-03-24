"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useTransition } from "react"
import { Button } from "@/components/ui/button"

interface PaginationProps {
  currentPage: number
  totalPages: number
}

export function Pagination({ currentPage, totalPages }: PaginationProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  // Create new search params
  const createQueryString = (page: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("page", page.toString())
    return params.toString()
  }

  // Navigate to a specific page
  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages || page === currentPage) return

    startTransition(() => {
      router.push(`${pathname}?${createQueryString(page)}`)
    })
  }

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: number[] = []
    
    if (totalPages <= 5) {
      // If 5 or fewer pages, show all
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else if (currentPage <= 3) {
      // Near start: show 1-5
      for (let i = 1; i <= 5; i++) {
        pages.push(i)
      }
    } else if (currentPage >= totalPages - 2) {
      // Near end: show last 5
      for (let i = totalPages - 4; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // In middle: show current and 2 on each side
      for (let i = currentPage - 2; i <= currentPage + 2; i++) {
        pages.push(i)
      }
    }
    
    return pages
  }

  // Only show pagination if there are multiple pages
  if (totalPages <= 1) return null

  return (
    <div className="flex justify-center items-center gap-2 mt-8">
      <Button
        variant="outline"
        size="sm"
        disabled={currentPage <= 1 || isPending}
        onClick={() => handlePageChange(currentPage - 1)}
      >
        Previous
      </Button>

      {getPageNumbers().map((page) => (
        <Button
          key={page}
          variant={page === currentPage ? "secondary" : "outline"}
          size="icon"
          className="w-8 h-8"
          disabled={isPending}
          onClick={() => handlePageChange(page)}
        >
          {page}
        </Button>
      ))}

      <Button
        variant="outline"
        size="sm"
        disabled={currentPage >= totalPages || isPending}
        onClick={() => handlePageChange(currentPage + 1)}
      >
        Next
      </Button>
    </div>
  )
}