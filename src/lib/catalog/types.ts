import type { ContentStatus } from '@/lib/cms/types';

/**
 * Canonical component model.
 *
 * Design note: compatibility-relevant attributes (socket, form factor,
 * GPU length, PSU wattage, ...) are FIRST-CLASS TYPED FIELDS, not JSON.
 * The compatibility engine is deterministic and must be able to compare
 * these values without parsing free text. The `specs` bag holds
 * display-only extras (clock speeds, warranty, marketing spec sheet rows)
 * that no rule depends on.
 */

export const COMPONENT_CATEGORIES = [
  'cpu',
  'motherboard',
  'cooler',
  'ram',
  'gpu',
  'storage',
  'psu',
  'case',
  'os',
  'accessory',
  // Whole-unit categories. These are things sold complete rather than parts
  // assembled into a tower, so the compatibility engine has nothing to say
  // about them and the configurator does not list them. They are catalogue
  // and storefront categories only.
  'networking',
  'nas',
  'mini-pc',
  // Sold alongside a build but with no compatibility rules written for them.
  // They stay out of CONFIGURATOR_CATEGORIES for the same reason the
  // whole-unit categories do: the engine can only check what it has rules for,
  // and listing a category it cannot reason about would imply otherwise.
  'case-fan',
  'monitor',
  'other',
] as const;

export type ComponentCategory = (typeof COMPONENT_CATEGORIES)[number];

/** Categories a build cannot be considered complete without. */
export const REQUIRED_CATEGORIES: ComponentCategory[] = [
  'cpu',
  'motherboard',
  'cooler',
  'ram',
  'gpu',
  'storage',
  'psu',
  'case',
];

export const CATEGORY_LABELS: Record<ComponentCategory, string> = {
  cpu: 'Processor',
  motherboard: 'Motherboard',
  cooler: 'CPU Cooler',
  ram: 'Memory',
  gpu: 'Graphics Card',
  storage: 'Storage',
  psu: 'Power Supply',
  case: 'Case',
  os: 'Operating System',
  accessory: 'Accessories',
  networking: 'Networking & Server',
  nas: 'NAS & Storage Enclosure',
  'mini-pc': 'Mini PC & Single-Board',
  'case-fan': 'Case Fan',
  monitor: 'Monitor',
  other: 'Other',
};

/**
 * Categories the configurator walks, in real build order.
 *
 * Deliberately NOT every value of COMPONENT_CATEGORIES. A switch, a NAS
 * enclosure and a Raspberry Pi are complete units; dropping them into a tower
 * build would ask the compatibility engine to compare a socket against a
 * rack-mount switch. They are sold from their own storefront pages instead.
 */
export const CONFIGURATOR_CATEGORIES: ComponentCategory[] = [
  'cpu',
  'motherboard',
  'cooler',
  'ram',
  'gpu',
  'storage',
  'psu',
  'case',
  'os',
  'accessory',
];

/**
 * Condition of the physical item being sold.
 *
 * Refurbished stock has to be labelled wherever a price is shown. A buyer
 * comparing two numbers is entitled to know that the cheaper one has been
 * opened, and `condition_notes` carries the specifics (what was replaced, what
 * cosmetic marks it has, what warranty applies) rather than a vague grade.
 */
export const COMPONENT_CONDITIONS = [
  'new',
  'open-box',
  'tested',
  'refurbished',
  'used',
] as const;
export type ComponentCondition = (typeof COMPONENT_CONDITIONS)[number];

export const CONDITION_LABELS: Record<ComponentCondition, string> = {
  new: 'New',
  'open-box': 'Open box',
  tested: 'Tested',
  refurbished: 'Refurbished',
  used: 'Used',
};

/**
 * What each condition actually claims.
 *
 * Shown next to the choice in the admin and used as the tooltip on the
 * storefront badge, so the same words mean the same thing in both places.
 *
 * `tested` and `refurbished` are separate on purpose. Calling a working
 * second-hand part "refurbished" when nothing was replaced overstates the work
 * done to it, and somebody paying a refurbished price is entitled to a
 * refurbished unit.
 */
export const CONDITION_DESCRIPTIONS: Record<ComponentCondition, string> = {
  new: 'Sealed and unused.',
  'open-box': 'Packaging opened, unit unused. A return, display piece or cancelled order.',
  tested: 'Used, checked over and confirmed working. Nothing was replaced.',
  refurbished: 'Used, then repaired or reconditioned. The notes say what was done.',
  used: 'Used and sold as-is. The notes describe its condition and any wear.',
};

/** Anything not sold as new needs its condition stated wherever the price is. */
export function isSecondHand(condition: ComponentCondition): boolean {
  return condition !== 'new';
}

export type FormFactor = 'e-atx' | 'atx' | 'micro-atx' | 'mini-itx';
export type MemoryType = 'ddr4' | 'ddr5';
export type CoolerType = 'air' | 'aio';
export type StorageInterface = 'nvme-m2' | 'sata';
export type PsuFormFactor = 'atx' | 'sfx' | 'sfx-l';

/**
 * Provenance flag. Seeded catalogue rows are marked `sample` because their
 * specifications have NOT been verified against manufacturer documentation.
 * Rows an operator has checked against a spec sheet get flipped to `verified`.
 * The UI surfaces this difference; nothing is presented as fact that isn't.
 */
export type DataConfidence = 'sample' | 'verified';

export interface ComponentRecord {
  id: string;
  sku: string;
  slug: string;
  category: ComponentCategory;
  brand: string;
  model: string;
  description: string;

  /** Retail price in Canadian cents. Never store money as a float. */
  price_cents: number;
  /** Landed cost in cents — admin only, never sent to public clients. */
  cost_cents: number | null;

  stock_quantity: number;
  low_stock_threshold: number;

  image_url: string | null;
  /** Additional images, in display order. Primary image is `image_url`. */
  gallery_urls: string[];
  /**
   * One optional product video, as a URL.
   *
   * A URL rather than an upload-only field because the two things an operator
   * actually has are a YouTube link and, occasionally, a phone clip of a
   * finished machine. Both are accepted — see `describeVideo`.
   */
  video_url: string | null;
  /**
   * Derived from `status` by a trigger in migration 0006. Read-only in
   * practice: write `status` and this follows. Kept because the dashboard,
   * the inventory table and low_stock_components still read it.
   */
  active: boolean;
  status: ContentStatus;
  featured: boolean;
  sort_order: number;
  /** One line for cards and listings; `description` is the full text. */
  short_description: string | null;
  seo_title: string | null;
  seo_description: string | null;
  archived_at: string | null;
  data_confidence: DataConfidence;

  /** New unless stated. Surfaced next to the price, never buried. */
  condition: ComponentCondition;
  /**
   * What was done to a refurbished unit, in plain words. Required in practice
   * for anything that is not `new`; the storefront prints it verbatim rather
   * than translating a grade letter nobody agrees on.
   */
  condition_notes: string | null;

  // --- CPU / cooler / motherboard socket matching ---
  socket: string | null;
  /** Coolers list every socket they ship brackets for. */
  supported_sockets: string[] | null;

  // --- Motherboard ---
  chipset: string | null;
  memory_slots: number | null;
  max_memory_gb: number | null;
  m2_slots: number | null;
  sata_ports: number | null;

  // --- Motherboard / case form factor ---
  form_factor: FormFactor | null;
  supported_form_factors: FormFactor[] | null;

  // --- Memory ---
  memory_type: MemoryType | null;
  memory_capacity_gb: number | null;
  memory_modules: number | null;
  memory_speed_mts: number | null;

  // --- Power ---
  /** Typical sustained board power for the part, in watts. */
  tdp_watts: number | null;
  /** Vendor-recommended total system PSU, watts (GPUs mostly). */
  recommended_psu_watts: number | null;
  psu_wattage: number | null;
  psu_efficiency: string | null;
  psu_form_factor: PsuFormFactor | null;

  // --- Physical clearance ---
  gpu_length_mm: number | null;
  max_gpu_length_mm: number | null;
  cooler_height_mm: number | null;
  max_cooler_height_mm: number | null;
  /** Radiator sizes a case can mount, e.g. [240, 280, 360]. */
  radiator_support_mm: number[] | null;
  /** Radiator size an AIO ships with. */
  radiator_size_mm: number[] | null;
  cooler_type: CoolerType | null;
  /**
   * Heat a cooler can dissipate, in watts. Deliberately separate from
   * `tdp_watts`, which for a cooler means the power its own fans and pump
   * DRAW. Conflating the two made a 360 mm AIO look like a 12 W cooler.
   */
  cooling_capacity_watts: number | null;

  // --- Storage ---
  storage_interface: StorageInterface | null;
  storage_capacity_gb: number | null;

  // --- Interconnect ---
  pcie_version: number | null;

  /** Display-only extras. No compatibility rule may read from here. */
  specs: Record<string, string | number | boolean>;

  created_at: string;
  updated_at: string;
}

/** Public-facing shape: cost is stripped before leaving the server. */
export type PublicComponent = Omit<ComponentRecord, 'cost_cents'>;

/** A configurator selection: one component id per category, with quantity. */
export interface BuildSelection {
  componentId: string;
  quantity: number;
}

export type BuildSelectionMap = Partial<Record<ComponentCategory, BuildSelection[]>>;

/** A build resolved against the catalogue — what the engines operate on. */
export interface ResolvedBuildItem {
  category: ComponentCategory;
  component: PublicComponent;
  quantity: number;
}

export type ResolvedBuild = ResolvedBuildItem[];

export function stripCost(component: ComponentRecord): PublicComponent {
  const { cost_cents: _cost, ...rest } = component;
  void _cost;
  return rest;
}

export function isInStock(component: Pick<ComponentRecord, 'stock_quantity'>, qty = 1): boolean {
  return component.stock_quantity >= qty;
}

export function isLowStock(
  component: Pick<ComponentRecord, 'stock_quantity' | 'low_stock_threshold'>,
): boolean {
  return component.stock_quantity > 0 && component.stock_quantity <= component.low_stock_threshold;
}

/**
 * Availability as a customer would describe it.
 *
 * Three states, all derived from the stock count and the row's own low-stock
 * threshold. Nothing here is hardcoded and nothing is invented: a product with
 * no stock says so rather than saying "ships in 2-3 days", which is a promise
 * the catalogue cannot make.
 */
export type StockState = 'in-stock' | 'low' | 'out';

export function stockState(
  component: Pick<ComponentRecord, 'stock_quantity' | 'low_stock_threshold'>,
): StockState {
  if (component.stock_quantity <= 0) return 'out';
  return isLowStock(component) ? 'low' : 'in-stock';
}

/**
 * The canonical address of a product page.
 *
 * ONE function, used by every card, every breadcrumb, the sitemap and the
 * structured data. A product reachable at two URLs splits its own ranking and
 * doubles the pages a crawler has to fetch, and that happens the moment two
 * call sites build the path by hand.
 *
 * `slug` is what the column holds; `id` is the fallback because the admin
 * create route writes `slug: input.id` and older rows may predate the column.
 * Both are lowercase, hyphenated and unique, so either makes a valid address.
 */
export function productHref(component: Pick<ComponentRecord, 'id' | 'slug'>): string {
  return `/products/${component.slug || component.id}`;
}

/**
 * How to play a video URL, if it can be played at all.
 *
 * Two kinds arrive in practice and they need different markup:
 *
 *   `file`  — an mp4 or webm, either uploaded to the media bucket or hosted
 *             elsewhere. Rendered as a native <video> with `preload="none"`,
 *             so a product page that nobody scrolls to the video on costs
 *             nothing to load.
 *
 *   `embed` — YouTube or Vimeo. Rendered as a poster the visitor clicks, which
 *             then swaps in the iframe. An iframe mounted on page load pulls in
 *             several hundred kilobytes of third-party script and sets cookies
 *             before anybody has asked to watch anything.
 *
 * Anything else returns null and no video section is rendered. A link that is
 * not a video must not produce an empty player.
 */
export interface VideoSource {
  kind: 'file' | 'embed';
  /** For `file`, the media URL. For `embed`, the privacy-mode embed URL. */
  src: string;
  /** Present for `embed` only: the provider's own thumbnail. */
  poster: string | null;
  label: string;
}

export function describeVideo(url: string | null | undefined): VideoSource | null {
  const raw = (url ?? '').trim();
  if (!raw) return null;

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    // Not a URL at all. Nothing to play, and nothing to report: the admin form
    // validates the field, and a bad row should degrade to no video rather
    // than to an error page.
    return null;
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;

  const host = parsed.hostname.replace(/^www\./, '').toLowerCase();

  if (host === 'youtube.com' || host === 'm.youtube.com') {
    const id = parsed.searchParams.get('v') ?? parsed.pathname.split('/').filter(Boolean).pop();
    if (id) return youtube(id);
  }
  if (host === 'youtu.be') {
    const id = parsed.pathname.split('/').filter(Boolean)[0];
    if (id) return youtube(id);
  }
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const id = parsed.pathname.split('/').filter(Boolean).pop();
    if (id && /^\d+$/.test(id)) {
      return {
        kind: 'embed',
        src: `https://player.vimeo.com/video/${id}?dnt=1`,
        // Vimeo has no guessable thumbnail URL, so the page draws its own
        // placeholder rather than linking to an image that may 404.
        poster: null,
        label: 'Play product video on Vimeo',
      };
    }
  }

  if (/\.(mp4|webm)$/i.test(parsed.pathname)) {
    return { kind: 'file', src: raw, poster: null, label: 'Product video' };
  }

  return null;
}

function youtube(id: string): VideoSource {
  // youtube-nocookie, so loading the player does not set advertising cookies
  // on a visitor who only wanted to watch a graphics card spin.
  return {
    kind: 'embed',
    src: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?rel=0`,
    poster: `https://i.ytimg.com/vi/${encodeURIComponent(id)}/hqdefault.jpg`,
    label: 'Play product video on YouTube',
  };
}

/**
 * Full product name for carts, orders and quotes.
 *
 * Most models are named without the brand ("Ryzen 5 7600X"), so the two are
 * joined. Some are not: Raspberry Pi calls its board the "Raspberry Pi 5", and
 * naively joining produced "Raspberry Pi Raspberry Pi 5" on cart lines and
 * order records. Where the model already opens with the brand, the brand is
 * left off rather than repeated.
 */
export function displayName(component: Pick<ComponentRecord, 'brand' | 'model'>): string {
  const brand = component.brand.trim();
  const model = component.model.trim();
  if (!brand) return model;
  if (model.toLowerCase().startsWith(brand.toLowerCase())) return model;
  return `${brand} ${model}`.trim();
}
