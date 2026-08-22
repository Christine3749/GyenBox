import { getSupabaseBrowserClient, hasSupabaseBrowserConfig } from '@/lib/supabase-client';

export const supabase = typeof window !== 'undefined' && hasSupabaseBrowserConfig()
  ? getSupabaseBrowserClient()
  : null;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ChatSession {
  id:         string;
  user_id:    string;
  title:      string;
  model:      string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id:         string;
  session_id: string;
  user_id:    string;
  role:       'user' | 'model';
  content:    string;
  created_at: string;
}
