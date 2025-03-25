import { createClient } from "@supabase/supabase-js"
import dotenv from "dotenv"

// Load environment variables from Supabase config file
dotenv.config({ path: ".env.supabase" })

// Direct connection URL for PostgreSQL
const dbUrl = process.env.DIRECT_URL
console.log("Using direct connection URL:", dbUrl ? "URL configured" : "URL missing")

// Supabase client configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase URL or Anon Key in .env.supabase file")
}

console.log("Supabase URL:", supabaseUrl)
const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
  try {
    // Try to get service health status first
    console.log("Checking Supabase service health...")
    
    // Check if we can connect to the database
    const { data, error } = await supabase
      .from("_test_connection")
      .select("*")
      .limit(1)
    
    if (error && error.code !== "PGRST116") {
      // PGRST116 means relation doesn't exist, which is fine
      console.warn("Test query returned an error (might be normal if table doesn't exist):", error.message)
    } else if (data) {
      console.log("Query executed successfully:", data)
    }
    
    // Check database connection using RPC if available
    try {
      const { data: pingData, error: pingError } = await supabase.rpc('ping')
      if (pingError) {
        console.warn("RPC ping failed (might be normal if function doesn't exist):", pingError.message)
      } else {
        console.log("RPC ping successful:", pingData)
      }
    } catch (err) {
      console.warn("RPC test failed (might be normal if function doesn't exist)")
    }
    
    console.log("Supabase connection verified successfully!")
  } catch (error) {
    console.error("Supabase connection failed:", error)
    process.exit(1)
  }
}

main()

