import { getSupabasePublicClient, getSupabaseServerClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { SERVICE_CONTENT } from '@/content/services';
import { BUILD_PRESETS } from '@/lib/catalog/presets';
import {
  CATEGORY_LABELS,
  COMPONENT_CATEGORIES,
  type ComponentCategory,
} from '@/lib/catalog/types';
import type {
  BuildPresetRecord,
  CategoryMeta,
  PresetAudience,
  PromotionPlacement,
  PromotionRecord,
  PublicPromotion,
  ServiceRecord,
} from '@/lib/cms/types';
import type { PortfolioBuild } from '@/types/domain';

/**
 * Content reads.
 *
 * Same contract as the catalogue repository: the database is authoritative
 * when it is configured and answering, and the in-repo content is the
 * fallback when it is not. That is what keeps the site renderable from a
 * fresh clone, and what stops a database outage taking the storefront down.
 *
 * Every list function reports where its rows came from, for the same reason
 * the catalogue does: a page that quietly serves fallback content while
 * claiming to be live is the failure mode worth designing against.
 */

export type ContentSource = 'database' | 'fallback';

export interface ContentResult<T> {
  rows: T[];
  source: ContentSource;
}

function fallback<T>(rows: T[]): ContentResult<T> {
  return { rows, source: 'fallback' };
}

const NOW = new Date(0).toISOString();

// ---------------------------------------------------------------------------
// Services
// ---------------------------------------------------------------------------

/** The in-repo services, shaped as though they had come from the table. */
function fallbackServices(): ServiceRecord[] {
  return SERVICE_CONTENT.map((service) => ({
    id: service.id,
    slug: service.slug,
    name: service.name,
    short_description: service.short_description,
    description: null,
    includes: service.includes,
    note: service.note ?? null,
    price_text: service.price_text ?? null,
    image_url: null,
    icon: null,
    status: 'published' as const,
    featured: Boolean(service.featured),
    sort_order: service.sort_order,
    seo_title: null,
    seo_description: null,
    created_at: NOW,
    updated_at: NOW,
  }));
}

export async function listPublishedServices(): Promise<ContentResult<ServiceRecord>> {
  const supabase = getSupabasePublicClient();
  if (!supabase) return fallback(fallbackServices());

  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('status', 'published')
    .order('sort_order', { ascending: true });

  // An empty result is NOT a failure. It means an admin has unpublished
  // everything, which is a legitimate state and must not be silently papered
  // over with the seed content.
  if (error || !data) {
    console.error('[cms] services query failed, using in-repo content', error?.message);
    return fallback(fallbackServices());
  }
  return { rows: data as unknown as ServiceRecord[], source: 'database' };
}

export async function listAllServices(): Promise<ServiceRecord[]> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return fallbackServices();
  const { data } = await supabase
    .from('services')
    .select('*')
    .order('sort_order', { ascending: true });
  return (data as unknown as ServiceRecord[]) ?? fallbackServices();
}

// ---------------------------------------------------------------------------
// Build presets
// ---------------------------------------------------------------------------

function fallbackPresets(): BuildPresetRecord[] {
  return BUILD_PRESETS.map((preset, index) => ({
    id: preset.slug,
    slug: preset.slug,
    name: preset.name,
    audience: preset.audience,
    tagline: preset.tagline,
    rationale: preset.rationale,
    highlights: preset.highlights,
    items: preset.items,
    hero_image_url: null,
    gallery_urls: [],
    status: 'published' as const,
    featured: false,
    sort_order: (index + 1) * 10,
    seo_title: null,
    seo_description: null,
    created_at: NOW,
    updated_at: NOW,
  }));
}

export async function listPublishedPresets(
  audience?: PresetAudience,
): Promise<ContentResult<BuildPresetRecord>> {
  const supabase = getSupabasePublicClient();
  if (!supabase) {
    const rows = fallbackPresets();
    return fallback(audience ? rows.filter((p) => p.audience === audience) : rows);
  }

  let query = supabase.from('build_presets').select('*').eq('status', 'published');
  if (audience) query = query.eq('audience', audience);

  const { data, error } = await query.order('sort_order', { ascending: true });
  if (error || !data) {
    console.error('[cms] presets query failed, using in-repo content', error?.message);
    const rows = fallbackPresets();
    return fallback(audience ? rows.filter((p) => p.audience === audience) : rows);
  }
  return { rows: data as unknown as BuildPresetRecord[], source: 'database' };
}

export async function getPublishedPreset(slug: string): Promise<BuildPresetRecord | null> {
  const { rows } = await listPublishedPresets();
  return rows.find((p) => p.slug === slug) ?? null;
}

export async function listAllPresets(): Promise<BuildPresetRecord[]> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return fallbackPresets();
  const { data } = await supabase
    .from('build_presets')
    .select('*')
    .order('audience')
    .order('sort_order', { ascending: true });
  return (data as unknown as BuildPresetRecord[]) ?? fallbackPresets();
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

function fallbackCategories(): CategoryMeta[] {
  return COMPONENT_CATEGORIES.map((category, index) => ({
    category,
    label: CATEGORY_LABELS[category],
    description: null,
    image_url: null,
    sort_order: (index + 1) * 10,
    active: true,
    seo_title: null,
    seo_description: null,
    created_at: NOW,
    updated_at: NOW,
  }));
}

export async function listCategories(): Promise<CategoryMeta[]> {
  const supabase = getSupabasePublicClient();
  if (!supabase) return fallbackCategories();

  const { data, error } = await supabase
    .from('component_categories')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error || !data || data.length === 0) return fallbackCategories();

  // A category added to the enum but not yet seeded would otherwise vanish
  // from the admin, so anything missing is filled in from the code labels.
  const rows = data as unknown as CategoryMeta[];
  const seen = new Set(rows.map((r) => r.category));
  const missing = fallbackCategories().filter((c) => !seen.has(c.category));
  return [...rows, ...missing];
}

/** Label lookup that prefers the admin-edited label over the code default. */
export async function categoryLabels(): Promise<Record<ComponentCategory, string>> {
  const rows = await listCategories();
  const labels = { ...CATEGORY_LABELS };
  for (const row of rows) labels[row.category] = row.label;
  return labels;
}

// ---------------------------------------------------------------------------
// Promotions
// ---------------------------------------------------------------------------

/**
 * Live promotions for a placement.
 *
 * Read through `promotions_public`, which applies the publish state AND the
 * schedule window in the database. The table itself is admin-only, so an
 * unpublished or expired promotion cannot be pulled early by querying around
 * this function.
 */
export async function listLivePromotions(
  placement: PromotionPlacement,
): Promise<PublicPromotion[]> {
  const supabase = getSupabasePublicClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('promotions_public')
    .select('*')
    .eq('placement', placement)
    .order('sort_order', { ascending: true });

  if (error || !data) return [];
  return data as unknown as PublicPromotion[];
}

export async function listAllPromotions(): Promise<PromotionRecord[]> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from('promotions')
    .select('*')
    .order('sort_order', { ascending: true });
  return (data as unknown as PromotionRecord[]) ?? [];
}

// ---------------------------------------------------------------------------
// Portfolio
// ---------------------------------------------------------------------------

export async function listPublishedPortfolio(): Promise<PortfolioBuild[]> {
  const supabase = getSupabasePublicClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('portfolio_builds')
    .select('*')
    .eq('status', 'published')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  // No fallback content here, and that is deliberate. The portfolio documents
  // machines that were actually built; there is nothing honest to fall back to.
  if (error || !data) return [];
  return data as unknown as PortfolioBuild[];
}

export async function listAllPortfolio(): Promise<PortfolioBuild[]> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from('portfolio_builds')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });
  return (data as unknown as PortfolioBuild[]) ?? [];
}

/** True when content edits can actually reach the public site. */
export const isContentManaged = isSupabaseConfigured;
