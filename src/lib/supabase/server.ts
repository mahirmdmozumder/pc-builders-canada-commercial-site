import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { env, isSupabaseAdminConfigured, isSupabaseConfigured } from '@/lib/env';
import type { Database } from '@/types/database';

/**
 * Server-side Supabase clients.
 *
 * Two clients, deliberately separated:
 *
 *  - `getSupabaseServerClient()` runs as the signed-in user. Row Level
 *    Security applies, so a customer can only ever read their own rows even
 *    if a query forgets a filter. This is what page and route handlers use.
 *
 *  - `getSupabaseAdminClient()` uses the service-role key and BYPASSES RLS.
 *    It exists for exactly two jobs: Stripe webhooks (no user session) and
 *    audited admin writes. Never import it into a client component, and never
 *    call it without first checking the caller is an admin.
 */

export async function getSupabaseServerClient() {
  if (!isSupabaseConfigured) return null;

  const cookieStore = await cookies();

  return createServerClient<Database>(env.supabaseUrl!, env.supabaseAnonKey!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component, where cookies are read-only.
          // Session refresh is handled by middleware instead.
        }
      },
    },
  });
}

let publicClient: ReturnType<typeof createClient<Database>> | null = null;

/**
 * Anon-key client with NO cookie access, for data that is public by policy:
 * the component catalogue and published portfolio entries.
 *
 * Why it exists: reading cookies in a page forces dynamic rendering. The
 * catalogue is identical for every visitor, so reading it through a
 * session-less client lets the marketing pages stay statically rendered and
 * revalidated on a schedule.
 */
export function getSupabasePublicClient() {
  if (!isSupabaseConfigured) return null;
  publicClient ??= createClient<Database>(env.supabaseUrl!, env.supabaseAnonKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return publicClient;
}

let adminClient: ReturnType<typeof createClient<Database>> | null = null;

export function getSupabaseAdminClient() {
  if (!isSupabaseAdminConfigured) return null;
  adminClient ??= createClient<Database>(env.supabaseUrl!, env.supabaseServiceRoleKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return adminClient;
}
