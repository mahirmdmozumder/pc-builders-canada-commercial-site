import type { Metadata } from 'next';
import { permanentRedirect } from 'next/navigation';
import { PresetDetail, loadPreset, presetMetadata } from '@/components/build/preset-detail';
import { listPublishedPresets } from '@/lib/cms/repository';
import { presetHref } from '@/lib/cms/types';

/**
 * Workstations. Gaming machines live at /pre-built-gaming-pcs/[slug].
 *
 * The page itself is shared with the other audience's route — see
 * components/build/preset-detail.tsx. This file decides two things only: which
 * slugs are pre-rendered, and what happens to a slug that belongs elsewhere.
 *
 * A misfiled slug is PERMANENTLY redirected rather than 404'd. These addresses
 * have been live and in the sitemap, so a 404 would throw away a real URL and
 * break any link already shared. A 308 moves both the visitor and the search
 * engine to the address the page claims as canonical.
 */

export const revalidate = 60;

export async function generateStaticParams() {
  const { rows } = await listPublishedPresets('workstation');
  return rows.map((preset) => ({ slug: preset.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return presetMetadata(slug);
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  // Redirect before rendering: a preset of the other audience belongs at its
  // own address, and serving it here would reintroduce the duplicate URL this
  // split exists to remove.
  const data = await loadPreset(slug);
  if (data && data.preset.audience !== 'workstation') {
    permanentRedirect(presetHref(data.preset));
  }

  return <PresetDetail slug={slug} />;
}
