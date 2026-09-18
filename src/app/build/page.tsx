import type { Metadata } from 'next';
import { PageHeader, PageShell } from '@/components/ui';
import { Configurator } from '@/components/configurator/configurator';
import { listComponents, getCatalogSource } from '@/lib/catalog/repository';
import { getPreset } from '@/lib/catalog/presets';
import { getSessionUser } from '@/lib/auth/session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import type { SavedBuild } from '@/types/domain';

export const metadata: Metadata = {
  title: 'Custom PC Configurator',
  description:
    'Configure a custom PC part by part. Socket, memory, clearance, storage and power checks run on every change, with a live price estimate including Canadian tax.',
  alternates: { canonical: '/build' },
};

export default async function BuildPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string; build?: string }>;
}) {
  const { preset: presetSlug, build: buildId } = await searchParams;
  const preset = presetSlug ? getPreset(presetSlug) : undefined;

  const catalogue = await listComponents();
  const sampleData = getCatalogSource() === 'sample';

  // Loading a saved build goes through the session client, so RLS decides
  // whether this user may see it. An id belonging to someone else returns
  // nothing and the configurator simply opens empty.
  let saved: SavedBuild | null = null;
  if (buildId) {
    const user = await getSessionUser();
    if (user) {
      const supabase = await getSupabaseServerClient();
      const { data } = await supabase!
        .from('saved_builds')
        .select('*')
        .eq('id', buildId)
        .maybeSingle();
      saved = (data as SavedBuild | null) ?? null;
    }
  }

  const initialItems = saved?.items ?? preset?.items ?? [];
  const initialName = saved?.name ?? preset?.name ?? 'My custom build';

  return (
    <>
      <PageHeader
        eyebrow="Configurator"
        title={saved ? saved.name : preset ? `Start from ${preset.name}` : 'Build your PC'}
        description={
          saved
            ? 'Loaded from your saved builds. Prices and compatibility have been rechecked against the current catalogue.'
            : preset
              ? preset.rationale
              : 'Pick parts in any order. Every change re-runs the compatibility checks and updates the estimated power draw and price.'
        }
      />
      <PageShell className="py-8 sm:py-10">
        <Configurator
          catalogue={catalogue}
          initialItems={initialItems}
          initialName={initialName}
          sampleData={sampleData}
        />
      </PageShell>
    </>
  );
}
