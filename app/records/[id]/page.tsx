import { notFound } from "next/navigation"
import { RecordDetails } from "@/components/record-details"
import { ClientRecordCard } from "@/components/client-record-card"
import { log } from "@/lib/logger"
import { ApiUnavailable } from "@/components/api-unavailable"

// Define placeholder type (can be imported if centralized)
type Record = {
  id: number | string;
  title: string;
  artist?: string;
  cover_image?: string;
  label?: string;
  catalogNumber?: string;
  price?: number;
  condition?: string;
  quantity_available?: number;
  released?: string;
  country?: string;
  format?: string | string[];
  styles?: string[];
  tracks?: Track[];
  videos?: Video[];
  // Add other fields needed by RecordDetails/ClientRecordCard
};

// Define placeholder types for Track and Video if not imported
type Track = { /* ... fields ... */ };
type Video = { /* ... fields ... */ };


export default async function RecordPage({ params }: { params: { id: string } }) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const recordId = params.id;

  if (!apiUrl) {
    log("NEXT_PUBLIC_API_URL is not set. Cannot fetch record details.", {}, "error");
    // Use a generic error component or message
    return <div className="container mx-auto py-10 text-center">API configuration error.</div>;
  }

  try {
    // Fetch record and related records from the backend API
    // Adjust the endpoint/query params based on your API design
    // Example: Fetching record and including related records
    const fetchUrl = `${apiUrl}/api/records/${recordId}?include=related`; // Example query param
    
    log(`Fetching record details from API: ${fetchUrl}`, {}, "info");
    
    const response = await fetch(fetchUrl, {
      // Add cache control or revalidation strategy if needed
      next: { revalidate: 3600 } // Example: revalidate every hour
    });

    if (!response.ok) {
      if (response.status === 404) {
        log(`Record not found in API for ID: ${recordId}`, { status: 404, url: fetchUrl }, "info");
        notFound(); // Trigger Next.js 404 page
      } else {
        log(`Failed to fetch record from API. Status: ${response.status}`, { url: fetchUrl }, "error");
        throw new Error(`API request failed with status ${response.status}`);
      }
    }

    // Assuming API returns { record: {...}, relatedRecords: [...] }
    const data = await response.json();
    const record: Record | null = data.record; 
    const relatedRecords: Record[] = data.relatedRecords || [];

    if (!record) {
      log(`API returned success but no record data for ID: ${recordId}`, { url: fetchUrl }, "warn");
      notFound();
    }
    
    // Optional: Check quantity if API doesn't handle it (though it should)
    // if (record.quantity_available === 0) {
    //   log(`Record out of stock (checked on frontend): ${recordId}`);
    //   notFound();
    // }

    log(`Successfully fetched record: ${record.title}`, {}, "info");
    log(`Found ${relatedRecords.length} related records from API`, {}, "info");

    // Pass fetched data directly to components (assuming API format is suitable)
    return (
      <div className="container mx-auto py-6 px-4 sm:px-6">
        <RecordDetails record={record} />

        {relatedRecords.length > 0 && (
          <div className="mt-8 pt-4 border-t">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Related Records</h2>
              <span className="text-xs text-muted-foreground">{relatedRecords.length} items</span>
            </div>
            <div className="flex space-x-4 overflow-x-auto pb-4 scrollbar-hide">
              {relatedRecords.map((relatedRecord) => (
                <div 
                  key={relatedRecord.id} 
                  className="w-64 flex-shrink-0"
                >
                  <ClientRecordCard record={relatedRecord} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  } catch (error) {
    log(`Error fetching or processing record page ID ${recordId}:`, error, "error");
    // Use ApiUnavailable or throw error for boundary
    return <ApiUnavailable />; 
    // throw error; // Alternatively, let the nearest error boundary handle it
  }
}

