import type { Metadata } from 'next';
import { SavedBuildList } from '@/components/account/saved-builds';
import { requireUser } from '@/lib/auth/session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import type { SavedBuild } from '@/types/domain';

export const metadata: Metadata = {
  title: 'Saved builds',
  robots: { index: false, follow: false },
};

export default async function SavedBuildsPage() {
  await requireUser('/account/builds');
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase!
    .from('saved_builds')
    .select('*')
    .order('updated_at', { ascending: false });

  return <SavedBuildList builds={(data ?? []) as SavedBuild[]} />;
}
