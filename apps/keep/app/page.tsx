import SparkKeepApp from "@/components/spark/SparkKeepApp"
import { getPublicSupabaseConfig } from "@/lib/supabase-public-config"

export const dynamic = "force-dynamic"

export default function KeepPage() {
  return <SparkKeepApp supabaseConfig={getPublicSupabaseConfig()} />
}
