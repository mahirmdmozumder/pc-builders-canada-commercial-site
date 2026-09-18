'use client';

import { useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/env';

/**
 * Client-side session state, used only for cosmetic chrome: which link the
 * header shows. Keeping this out of the root layout means every public page
 * can still be statically rendered instead of being forced dynamic by a
 * cookie read.
 *
 * This is NOT access control. Admin pages check the role on the server, on
 * every request (see lib/auth/session.ts) and the database enforces RLS on
 * top of that.
 */
export interface ClientSession {
  signedIn: boolean;
  isAdmin: boolean;
  email: string | null;
  loading: boolean;
}

export function useClientSession(): ClientSession {
  // Whether auth exists at all is known synchronously from the build-time
  // environment, so the "no accounts here" case never needs a state update.
  const [state, setState] = useState<ClientSession>({
    signedIn: false,
    isAdmin: false,
    email: null,
    loading: isSupabaseConfigured,
  });

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    let active = true;

    async function load(userId: string | null, email: string | null) {
      if (!userId) {
        if (active) setState({ signedIn: false, isAdmin: false, email: null, loading: false });
        return;
      }
      const { data } = await supabase!.from('profiles').select('role').eq('id', userId).maybeSingle();
      if (active) {
        setState({
          signedIn: true,
          isAdmin: (data as { role?: string } | null)?.role === 'admin',
          email,
          loading: false,
        });
      }
    }

    supabase.auth.getUser().then(({ data }) => {
      void load(data.user?.id ?? null, data.user?.email ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      void load(session?.user?.id ?? null, session?.user?.email ?? null);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}
