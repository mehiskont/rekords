import { notFound } from "next/navigation"
import { getDiscogsRecord } from "@/lib/discogs"
import { RecordDetails } from "@/components/record-details"
import { ClientRecordCard } from "@/components/client-record-card"

export default async function RecordPage({ params }: { params: { id: string } }) {
  try {
    const { record, relatedRecords } = await getDiscogsRecord(params.id)

    // If record is null (not found or out of stock), show 404
    if (!record || record.quantity_available === 0) {
      notFound()
    }

    return (
      <div className="container max-w-6xl mx-auto px-4 py-12">
        <RecordDetails record={record} />

        {relatedRecords.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold mb-6">Related Records</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedRecords.map((relatedRecord) => (
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

