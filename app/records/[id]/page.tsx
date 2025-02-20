import { notFound } from "next/navigation"
import Image from "next/image"
import { getDiscogsRecord } from "@/lib/discogs"
import { Button } from "@/components/ui/button"
import { calculatePriceWithoutFees } from "@/lib/price-calculator"
import { RecordCard } from "@/components/record-card"

export default async function RecordPage({ params }: { params: { id: string } }) {
  try {
    console.log("Fetching record with ID:", params.id)
    const { record, relatedRecords } = await getDiscogsRecord(params.id)
    console.log("Fetched record:", record)
    console.log("Fetched related records:", relatedRecords)

    if (!record) {
      console.log("Record not found")
      notFound()
    }

    const price = calculatePriceWithoutFees(record.price)

    return (
      <div className="container max-w-6xl mx-auto px-4 py-12">
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <div className="relative aspect-square">
            <Image
              src={record.cover_image || "/placeholder.svg"}
              alt={record.title}
              fill
              className="object-contain rounded-lg"
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
            />
          </div>
          <div className="flex flex-col justify-center">
            <h1 className="text-3xl font-bold mb-4">{record.title}</h1>
            <p className="text-xl mb-4">{record.artist}</p>
            <div className="space-y-4">
              <p className="text-2xl font-bold">${price.toFixed(2)}</p>
              <p>Condition: {record.condition}</p>
              {record.genres.length > 0 && <p>Genres: {record.genres.join(", ")}</p>}
              <div className="flex flex-wrap">{record.label && <p>Label: {record.label} </p>} {record.release && <p>&nbsp;[{record.release}]</p>}</div>
              <Button size="lg" className="w-full md:w-auto">
                Add to Cart
              </Button>
            </div>
          </div>
        </div>

        {relatedRecords.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold mb-6">Related Records</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedRecords.map((relatedRecord) => (
                <RecordCard key={relatedRecord.id} record={relatedRecord} />
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

