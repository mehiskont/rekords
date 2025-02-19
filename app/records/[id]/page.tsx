import { notFound } from "next/navigation"
import Image from "next/image"
import { getDiscogsRecord } from "@/lib/discogs"
import { Button } from "@/components/ui/button"
import { calculatePriceWithoutFees } from "@/lib/price-calculator"
import { RecordCard } from "@/components/record-card"

export default async function RecordPage({ params }: { params: { id: string } }) {
  const { record, relatedRecords } = await getDiscogsRecord(params.id)

  if (!record) {
    notFound()
  }

  const price = calculatePriceWithoutFees(record.price)

  return (
    <div>
      <div className="grid md:grid-cols-2 gap-8 mb-12">
        <div>
          <Image
            src={record.cover_image || "/placeholder.svg"}
            alt={record.title}
            width={500}
            height={500}
            className="w-full rounded-lg shadow-lg"
          />
        </div>
        <div>
          <h1 className="text-3xl font-bold mb-4">{record.title}</h1>
          <p className="text-xl mb-4">{record.artist}</p>
          <p className="text-2xl font-bold mb-4">${price.toFixed(2)}</p>
          <p className="mb-4">Condition: {record.condition}</p>
          <Button size="lg" className="w-full md:w-auto">
            Add to Cart
          </Button>
        </div>
      </div>

      {relatedRecords.length > 0 && (
        <div className="mt-12">
          <h2 className="text-2xl font-bold mb-4">Related Records</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {relatedRecords.map((relatedRecord) => (
              <RecordCard key={relatedRecord.id} record={relatedRecord} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

