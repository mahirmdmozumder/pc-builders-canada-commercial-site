import { cache } from 'react';
import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import type { Profile, UserRole } from '@/types/domain';

/**
 * Authentication and authorization helpers.
 *
 * The rule this file enforces: a user's role is read from the `profiles`
 * table on the server, on every request. It is never taken from a cookie, a
 * client prop, or user metadata the client could influence. Hiding the /admin
 * link in the header is cosmetic; THIS is the access control.
 *
 * `cache()` dedupes the lookup within a single request so a page and its
 * layout do not each hit the database.
 */

export interface SessionUser {
  id: string;
  email: string;
  profile: Profile | null;
  role: UserRole;
}

export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return null;

  // getUser() revalidates the JWT with Supabase. getSession() alone trusts a
  // cookie that a client could have tampered with, so it is not used here.
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle<Profile>();

  return {
    id: user.id,
    email: user.email ?? profile?.email ?? '',
    profile: profile ?? null,
    role: profile?.role ?? 'customer',
  };
});

export async function isAdmin(): Promise<boolean> {
  const user = await getSessionUser();
  return user?.role === 'admin';
}

/** For customer pages: bounce to sign-in, preserving where they were headed. */
export async function requireUser(returnTo = '/account'): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  }
  return user;
}

/**
 * For admin pages and admin route handlers.
 *
 * A non-admin gets a 404-style redirect rather than a "forbidden" page: there
 * is no reason to confirm to a probing customer that the route exists.
 */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    redirect('/login?next=%2Fadmin');
  }
  if (user.role !== 'admin') {
    redirect('/account');
  }
  return user;
}

/** Route-handler variant: returns null instead of redirecting. */
export async function getAdminOrNull(): Promise<SessionUser | null> {
  const user = await getSessionUser();
  return user?.role === 'admin' ? user : null;
}
