import {
  getSupabaseBrowserClient,
  hasSupabaseBrowserConfig,
} from '@/lib/supabase-client';

export function getOptionalSupabaseClient() {
  return hasSupabaseBrowserConfig() ? getSupabaseBrowserClient() : null;
}
