// This is a proxy component that renders the server component
import { RecordGridServer } from "@/components/server-components/record-grid-server"

interface RecordGridProps {
  searchParams?: { [key: string]: string | string[] | undefined }
  showFilter?: boolean
}

// This component acts as a proxy to pass props to the server component
export async function RecordGrid({ searchParams = {}, showFilter = false }: RecordGridProps) {
  return <RecordGridServer searchParams={searchParams} showFilter={showFilter} />
}