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
};

/** Display order in the configurator — mirrors real build order. */
export const CATEGORY_ORDER: ComponentCategory[] = [
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
  active: boolean;
  data_confidence: DataConfidence;

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

export function displayName(component: Pick<ComponentRecord, 'brand' | 'model'>): string {
  return `${component.brand} ${component.model}`.trim();
}
