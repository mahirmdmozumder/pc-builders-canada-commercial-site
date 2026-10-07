import type { Metadata } from 'next';
import Link from 'next/link';
import { Alert, ButtonLink, PageHeader, PageShell } from '@/components/ui';
import { Configurator } from '@/components/configurator/configurator';
import {
  getComponentsByIds,
  isOrderable,
  listComponentsWithSource,
} from '@/lib/catalog/repository';
import type { ComponentCategory } from '@/lib/catalog/types';
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

  /**
   * The parts this page sends to the browser, and nothing else.
   *
   * ---------------------------------------------------------------------------
   * WHY THIS IS NOT THE WHOLE CATALOGUE ANY MORE
   * ---------------------------------------------------------------------------
   * It was, and the cost grew with the shop rather than with the page. At 64
   * rows nobody noticed; a 300-row motherboard import took this page to 273
   * rows and 552 KB, with motherboards alone 73% of it. All of it blocking
   * HTML, for a first screen that shows one picker.
   *
   * It was never only bytes. The configurator marks incompatible candidates by
   * running the compatibility engine once per candidate, so opening the
   * motherboard picker ran the engine 199 times, and again on every change to
   * the build.
   *
   * So the server now sends two things, and the pickers fetch the rest from
   * /api/catalog/components when they open:
   *
   *   PROCESSORS, because the processor picker is the one that opens by default
   *   on an empty build. Fetching it would mean a visitor's first sight of the
   *   configurator is a spinner.
   *
   *   THE PARTS ALREADY IN THE BUILD, so a saved build or a preset renders
   *   complete on first paint rather than filling in. These are looked up by
   *   id, which is a handful of rows however large the catalogue gets.
   *
   * Compatibility still runs in the browser against the SELECTED parts — a
   * dozen rows at most — so the feedback stays instant. That was never the part
   * that needed moving.
   */
  const PRELOADED: ComponentCategory[] = ['cpu'];

  const { components: processors, source, truncated } = await listComponentsWithSource({
    category: 'cpu',
  });

  // Resolved by id, so a build loaded from a preset or a saved configuration is
  // complete on arrival even though its parts' categories are not loaded yet.
  const selectedIds = (saved?.items ?? preset?.items ?? [])
    .map((item) => item.component_id)
    .filter(Boolean);
  const selected = selectedIds.length > 0 ? await getComponentsByIds(selectedIds) : new Map();

  // De-duplicated: a selected processor is in both lists.
  const catalogue = [
    ...processors,
    ...[...selected.values()].filter(
      (component) => !processors.some((p) => p.id === component.id),
    ),
  ];
  const sampleData = source === 'sample';
  const orderable = isOrderable(source);


  const initialItems = saved?.items ?? preset?.items ?? [];
  const initialName = saved?.name ?? preset?.name ?? 'My custom build';

  return (
    <>
      <PageHeader
        eyebrow="Configurator"
        /**
         * The way out, for somebody who would rather not choose parts.
         *
         * On a desktop the header shows four links and nothing else: every
         * category page -- workstations, gaming PCs, networking, NAS, mini PCs,
         * refurbished -- is reachable only from the footer. So a visitor who
         * opens the configurator, finds it more involved than they wanted and
         * would happily buy a finished machine has no visible route to one
         * without scrolling to the bottom of the page.
         *
         * This is the highest-intent moment to offer it: they have already said
         * they want a PC and are now deciding how much of it to specify
         * themselves.
         *
         * BOTH audiences are offered, not just workstations. /build serves a
         * gamer and a professional equally, and naming only one would tell half
         * the visitors that the page they wanted does not exist. It also mirrors
         * what those two pages already do -- each offers "Start from scratch"
         * back to here.
         */
        actions={
          <>
            <ButtonLink href="/gaming-pcs" variant="secondary">
              Pre-built gaming PCs
            </ButtonLink>
            <ButtonLink href="/workstations" variant="secondary">
              Pre-built workstations
            </ButtonLink>
          </>
        }
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
          preloadedCategories={PRELOADED}
          initialItems={initialItems}
          initialName={initialName}
          sampleData={sampleData}
          orderable={orderable}
        />
      </PageShell>
    </>
  );
}
