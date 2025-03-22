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
      <div className="container mx-auto py-12">
        <RecordDetails record={serializedRecord} />

        {serializedRelatedRecords.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold mb-6">Related Records</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

