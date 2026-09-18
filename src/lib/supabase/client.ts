'use client';

import { createBrowserClient } from '@supabase/ssr';
import { env, isSupabaseConfigured } from '@/lib/env';
import type { Database } from '@/types/database';

/**
 * Browser Supabase client. Uses the anon key, which is safe to ship: it only
 * grants what Row Level Security allows for the current session.
 */
export function getSupabaseBrowserClient() {
  if (!isSupabaseConfigured) return null;
  return createBrowserClient<Database>(env.supabaseUrl!, env.supabaseAnonKey!);
}
