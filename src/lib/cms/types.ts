import type { ComponentCategory } from '@/lib/catalog/types';
import type { SavedBuildItem } from '@/types/domain';

/**
 * Content types.
 *
 * These mirror the tables added in migration 0006 one-for-one, in the same
 * style as the existing domain types: plain interfaces with snake_case fields,
 * so a row read from Supabase needs no translation layer.
 */

export const CONTENT_STATUSES = ['draft', 'published', 'archived'] as const;
export type ContentStatus = (typeof CONTENT_STATUSES)[number];

export const CONTENT_STATUS_LABELS: Record<ContentStatus, string> = {
  draft: 'Draft',
  published: 'Published',
  archived: 'Archived',
};

/** Tone for the shared status badge, so every screen colours it the same. */
export const CONTENT_STATUS_TONE: Record<ContentStatus, 'ok' | 'warn' | 'neutral'> = {
  published: 'ok',
  draft: 'warn',
  archived: 'neutral',
};

/** Fields every editable content record carries. */
export interface ContentFields {
  status: ContentStatus;
  featured: boolean;
  sort_order: number;
  seo_title: string | null;
  seo_description: string | null;
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

/**
 * Display metadata for a category.
 *
 * Presentation only. The compatibility engine reads the enum, never this —
 * see migration 0005 for why that separation exists.
 */
export interface CategoryMeta {
  category: ComponentCategory;
  label: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
  active: boolean;
  seo_title: string | null;
  seo_description: string | null;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Services
// ---------------------------------------------------------------------------

export interface ServiceRecord extends ContentFields {
  id: string;
  slug: string;
  name: string;
  short_description: string;
  description: string | null;
  includes: string[];
  note: string | null;
  /**
   * Free text, not a number.
   *
   * Most service work is quoted after diagnosis. A numeric price column would
   * invite a figure on the site that cannot be honoured once the machine is
   * open, which the services page is explicit about.
   */
  price_text: string | null;
  image_url: string | null;
  icon: string | null;
  /**
   * Questions with real answers, rendered on the service page and emitted as
   * FAQPage structured data from the same array. Google requires marked-up
   * answers to be visible, and one source is what guarantees that.
   */
  faqs: FaqEntry[];
  created_at: string;
  updated_at: string;
}

export interface FaqEntry {
  question: string;
  answer: string;
}

// ---------------------------------------------------------------------------
// Build presets
// ---------------------------------------------------------------------------

export const PRESET_AUDIENCES = ['gaming', 'workstation'] as const;
export type PresetAudience = (typeof PRESET_AUDIENCES)[number];

export const PRESET_AUDIENCE_LABELS: Record<PresetAudience, string> = {
  gaming: 'Gaming PCs',
  workstation: 'Workstations',
};

/** Where each audience's machines live. */
export const PRESET_AUDIENCE_PATHS: Record<PresetAudience, string> = {
  gaming: '/pre-built-gaming-pcs',
  workstation: '/workstations',
};

/**
 * The canonical address of a preset's page.
 *
 * ---------------------------------------------------------------------------
 * ONE FUNCTION, FOR THE REASON productHref() IS ONE FUNCTION
 * ---------------------------------------------------------------------------
 * This address was hand-built in six places: both list pages, the sitemap,
 * the preset card twice, and the shop item mapper. That was survivable while
 * every preset shared a path. It stops being survivable now that the path
 * depends on the preset's audience, because six independent copies of an
 * audience check will not stay in agreement.
 *
 * The note on productHref() makes the same argument for components, and this
 * codebase has already paid for that lesson three times over: the
 * finished-machine predicate lived in three places and two of them went stale,
 * the stock label lived in five, and a card was made clickable in one place and
 * not another.
 *
 * ---------------------------------------------------------------------------
 * WHY WORKSTATIONS MOVED
 * ---------------------------------------------------------------------------
 * Every preset used to live under /pre-built-gaming-pcs/, workstations
 * included — so /pre-built-gaming-pcs/creator-workstation was a page whose own
 * title read "Workstation PC". A customer sharing that link sent something that
 * contradicted itself, and a search engine was offered a gaming URL for a
 * workstation product, which is the higher-value search of the two.
 *
 * The gaming path is kept for gaming machines rather than replaced with
 * something neutral, because "pre-built gaming pcs" is the phrase people
 * actually search and there is no reason to give it up.
 */
export function presetHref(preset: Pick<BuildPresetRecord, 'slug' | 'audience'>): string {
  return `${PRESET_AUDIENCE_PATHS[preset.audience]}/${preset.slug}`;
}

/**
 * A starting configuration.
 *
 * Deliberately has no price column. The total is computed live from the
 * catalogue rows in `items`, so a preset can never advertise a price the parts
 * no longer cost.
 */
export interface BuildPresetRecord extends ContentFields {
  id: string;
  slug: string;
  name: string;
  audience: PresetAudience;
  tagline: string;
  rationale: string;
  highlights: string[];
  items: SavedBuildItem[];
  hero_image_url: string | null;
  gallery_urls: string[];
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Promotions
// ---------------------------------------------------------------------------

export const PROMOTION_PLACEMENTS = ['home-hero', 'home-banner'] as const;
export type PromotionPlacement = (typeof PROMOTION_PLACEMENTS)[number];

export const PROMOTION_PLACEMENT_LABELS: Record<PromotionPlacement, string> = {
  'home-hero': 'Homepage — under the hero',
  'home-banner': 'Homepage — banner strip',
};

export interface PromotionRecord {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  image_url: string | null;
  button_text: string | null;
  button_url: string | null;
  starts_at: string | null;
  ends_at: string | null;
  placement: PromotionPlacement;
  status: ContentStatus;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/** What `promotions_public` exposes: no status, no timestamps, already filtered. */
export type PublicPromotion = Pick<
  PromotionRecord,
  | 'id'
  | 'title'
  | 'subtitle'
  | 'description'
  | 'image_url'
  | 'button_text'
  | 'button_url'
  | 'placement'
  | 'sort_order'
  | 'starts_at'
  | 'ends_at'
>;

/**
 * Whether a promotion is live right now.
 *
 * The database view applies the same rule, so this exists for the admin, which
 * reads the table directly and needs to show whether something published is
 * actually appearing yet.
 */
export function isPromotionLive(promo: PromotionRecord, now = new Date()): boolean {
  if (promo.status !== 'published') return false;
  if (promo.starts_at && new Date(promo.starts_at) > now) return false;
  if (promo.ends_at && new Date(promo.ends_at) <= now) return false;
  return true;
}

/** Explains, in words, why a promotion is or is not showing. */
export function promotionState(
  promo: PromotionRecord,
  now = new Date(),
): { live: boolean; reason: string } {
  if (promo.status === 'draft') return { live: false, reason: 'Draft — not published' };
  if (promo.status === 'archived') return { live: false, reason: 'Archived' };
  if (promo.starts_at && new Date(promo.starts_at) > now) {
    return { live: false, reason: `Scheduled — starts ${new Date(promo.starts_at).toLocaleDateString('en-CA')}` };
  }
  if (promo.ends_at && new Date(promo.ends_at) <= now) {
    return { live: false, reason: `Expired ${new Date(promo.ends_at).toLocaleDateString('en-CA')}` };
  }
  if (promo.ends_at) {
    return { live: true, reason: `Live until ${new Date(promo.ends_at).toLocaleDateString('en-CA')}` };
  }
  return { live: true, reason: 'Live' };
}
