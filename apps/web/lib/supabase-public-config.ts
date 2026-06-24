export type PublicSupabaseConfig = {
  url: string
  anonKey: string
}

const DEFAULT_SUPABASE_URL = "https://hrtynofmjcumuanjvpxz.supabase.co"

export function getPublicSupabaseConfig(): PublicSupabaseConfig | null {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? DEFAULT_SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) return null
  return { url, anonKey }
}