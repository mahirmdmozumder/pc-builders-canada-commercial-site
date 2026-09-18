import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

/**
 * Sign out. POST only: a GET would let a third-party page sign a visitor out
 * by embedding an image pointing at this URL.
 */
export async function POST(request: Request) {
  const supabase = await getSupabaseServerClient();
  await supabase?.auth.signOut();
  return NextResponse.redirect(new URL('/', new URL(request.url).origin), { status: 303 });
}
