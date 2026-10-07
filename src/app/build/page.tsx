import type { Metadata } from 'next';
import Link from 'next/link';
import { Alert, PageHeader, PageShell } from '@/components/ui';
import { Configurator } from '@/components/configurator/configurator';
import { isOrderable, listComponentsWithSource } from '@/lib/catalog/repository';
import { CONFIGURATOR_CATEGORIES } from '@/lib/catalog/types';
import { getPublishedPreset } from '@/lib/cms/repository';
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
  const preset = presetSlug ? await getPublishedPreset(presetSlug) : null;

  /**
   * Only the categories the configurator walks.
   *
   * It used to ask for everything, so every switch, NAS enclosure, mini PC and
   * resold machine was serialised into this page's HTML for a picker that never
   * lists them. Seventeen rows of ninety-two at the time of writing, and they
   * grow with the storefront rather than with the configurator.
   *
   * This is the cheap half of keeping this page small. The expensive half —
   * fetching candidates per category on demand instead of shipping the whole
   * catalogue to the browser — is still outstanding, and the note in
   * CatalogResult.truncated explains the cliff at the far end of it.
   */
  const { components: catalogue, source, truncated } = await listComponentsWithSource({
    categories: CONFIGURATOR_CATEGORIES,
  });
  const sampleData = source === 'sample';
  const orderable = isOrderable(source);

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
        {/* An incomplete parts list is worth saying out loud. A build configured
            against a truncated catalogue may be missing the very part that
            would have fitted. */}
        {truncated ? (
          <Alert tone="warn" title="Some parts are missing from this list" className="mb-6">
            The catalogue is larger than this page could load, so the pickers below are
            incomplete. Please <Link href="/contact" className="underline">get in touch</Link> and
            we will configure the build with you.
          </Alert>
        ) : null}
        <Configurator
          catalogue={catalogue}
          initialItems={initialItems}
          initialName={initialName}
          sampleData={sampleData}
          orderable={orderable}
        />
      </PageShell>
    </>
  );
}
