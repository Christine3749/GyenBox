import SparkKeepApp from "@/components/spark/SparkKeepApp"
import { getPublicHsConfig } from "@/lib/hs-public-config"

export const dynamic = "force-dynamic"

export default function KeepPage() {
  return <SparkKeepApp supabaseConfig={getPublicHsConfig()} />
}
