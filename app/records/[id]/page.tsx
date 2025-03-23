import { notFound } from "next/navigation"
import { getDiscogsRecord } from "@/lib/discogs"
import { serializeForClient } from "@/lib/utils"
import { RecordDetails } from "@/components/record-details"
import { ClientRecordCard } from "@/components/client-record-card"

export default async function RecordPage({ params }: { params: { id: string } }) {
  try {
    const { record, relatedRecords } = await getDiscogsRecord(params.id)

    // If record is null (not found, out of stock, or API issue), show 404
    // Added more detailed logging to help troubleshoot
    if (!record) {
      console.log(`Record not found for ID: ${params.id}`)
      notFound()
    }
    
    // Out of stock
    if (record.quantity_available === 0) {
      console.log(`Record out of stock for ID: ${params.id}`)
      notFound()
    }

    // Serialize record and related records before passing to client components
    const serializedRecord = serializeForClient(record)
    const serializedRelatedRecords = relatedRecords.map((record) => serializeForClient(record))

    return (
      <div className="container mx-auto py-6 px-4 sm:px-6">
        <RecordDetails record={serializedRecord} />

        {serializedRelatedRecords.length > 0 && (
          <div className="mt-8 pt-4 border-t">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Related Records</h2>
              <span className="text-xs text-muted-foreground">{serializedRelatedRecords.length} items</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {serializedRelatedRecords.map((relatedRecord) => (
                <ClientRecordCard key={relatedRecord.id} record={relatedRecord} />
              ))}
            </div>
          </div>
        )}
      </div>
    )
  } catch (error) {
    console.error("Error in RecordPage:", error)
    throw error // This will trigger the closest error boundary
  }
}

