import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

/**
 * Exchanges an emailed auth code for a session.
 *
 * Used by email confirmation and password reset links. The `next` parameter
 * is restricted to same-site paths so a crafted link cannot bounce a
 * freshly authenticated user to an external site.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const requested = url.searchParams.get('next') ?? '/account';
  const next = requested.startsWith('/') && !requested.startsWith('//') ? requested : '/account';

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=missing_code', url.origin));
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.redirect(new URL('/login', url.origin));
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL('/login?error=expired_link', url.origin));
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
