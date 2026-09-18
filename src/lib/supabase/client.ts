'use client';

import { createBrowserClient } from '@supabase/ssr';
import { env, isSupabaseConfigured } from '@/lib/env';

/**
 * Browser Supabase client. Uses the anon key, which is safe to ship: it only
 * grants what Row Level Security allows for the current session.
 */
export function getSupabaseBrowserClient() {
  if (!isSupabaseConfigured) return null;
  return createBrowserClient(env.supabaseUrl!, env.supabaseAnonKey!);
}
