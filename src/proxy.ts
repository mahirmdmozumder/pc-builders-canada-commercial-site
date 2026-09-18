import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * Session refresh, and a first gate on private routes.
 *
 * Named `proxy` in a `proxy.ts` file: Next 16 renamed the middleware file
 * convention, and the old name logs a deprecation warning on every boot.
 *
 * Supabase access tokens are short-lived. Without a refresh on each request a
 * signed-in user silently becomes signed-out on the next server render. This
 * middleware refreshes the token and writes the rotated cookies back.
 *
 * It also bounces anonymous requests away from /account and /admin. That is a
 * convenience, NOT the security boundary: middleware can be bypassed in ways
 * a database policy cannot. Real authorization lives in two places, both of
 * which run on every request:
 *   - requireAdmin() / requireUser() in lib/auth/session.ts, server-side
 *   - Row Level Security in Postgres
 */

const PROTECTED_PREFIXES = ['/account', '/admin'];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // With no auth backend configured there is no session to refresh, and the
  // pages themselves explain that accounts are unavailable.
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  if (!user && PROTECTED_PREFIXES.some((prefix) => path.startsWith(prefix))) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/login';
    redirectUrl.searchParams.set('next', path);
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Everything except static assets and image files. Auth cookies are only
     * relevant to document and API requests.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
