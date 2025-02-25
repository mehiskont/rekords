import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase URL or Anon Key")
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
  try {
    const { data, error } = await supabase.from("users").select("*").limit(1)
    if (error) throw error
    console.log("Supabase connection successful:", data)
  } catch (error) {
    console.error("Supabase connection failed:", error)
  }
}

main()

