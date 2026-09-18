import type { ResolvedBuild, ComponentCategory } from '@/lib/catalog/types';

/**
 * System power estimation.
 *
 * This is an ESTIMATE, not a measurement. It sums the per-part sustained
 * power figures stored on each catalogue row and adds a fixed allowance for
 * the parts of a system that draw power but that the customer never picks
 * individually (chipset, fans, USB devices, VRM losses).
 *
 * Why a table of defaults: catalogue rows may legitimately have a null
 * `tdp_watts` (a case, an OS licence, a cable). Rather than treating those
 * as zero silently, each category has a documented default so the number
 * the customer sees is explainable line by line.
 */

/** Sustained watts assumed for a part when the catalogue row has no figure. */
export const CATEGORY_POWER_DEFAULTS: Partial<Record<ComponentCategory, number>> = {
  cpu: 65,
  motherboard: 40,
  gpu: 150,
  ram: 5, // per module kit entry
  storage: 7,
  cooler: 6,
  case: 0,
  psu: 0,
  os: 0,
  accessory: 0,
};

/**
 * Fixed system overhead in watts: case fans, chipset/IO, USB peripherals and
 * conversion losses that aren't attributable to a single selected component.
 */
export const SYSTEM_OVERHEAD_WATTS = 30;

/**
 * Headroom multiplier applied to the estimate to get a recommended PSU size.
 * 1.35 keeps a typical build in the 50-70% load band where ATX units are most
 * efficient, and leaves room for transient GPU spikes.
 */
export const PSU_HEADROOM_MULTIPLIER = 1.35;

/** Recommended PSU sizes are rounded up to the next real retail size. */
export const PSU_SIZE_STEPS = [
  450, 500, 550, 600, 650, 700, 750, 850, 1000, 1200, 1300, 1500, 1600,
];

/** A build is flagged if the PSU would sit above this share of continuous load. */
export const PSU_LOAD_WARNING_THRESHOLD = 0.85;

export interface PowerLineItem {
  category: ComponentCategory;
  name: string;
  quantity: number;
  wattsEach: number;
  watts: number;
  /** True when the figure came from the category default, not the part data. */
  estimated: boolean;
}

export interface PowerEstimate {
  /** Per-component contributions, for transparency in the UI. */
  lineItems: PowerLineItem[];
  overheadWatts: number;
  /** Total estimated sustained draw under load. */
  estimatedWatts: number;
  /** Suggested PSU capacity, rounded to a real retail size. */
  recommendedPsuWatts: number;
  /** Capacity of the PSU actually selected, if any. */
  selectedPsuWatts: number | null;
  /** estimatedWatts / selectedPsuWatts, or null when no PSU is selected. */
  loadRatio: number | null;
  status: 'sufficient' | 'tight' | 'insufficient' | 'no-psu';
}

function roundUpToPsuSize(watts: number): number {
  for (const size of PSU_SIZE_STEPS) {
    if (size >= watts) return size;
  }
  return PSU_SIZE_STEPS[PSU_SIZE_STEPS.length - 1];
}

export function estimatePower(build: ResolvedBuild): PowerEstimate {
  const lineItems: PowerLineItem[] = [];

  for (const item of build) {
    if (item.category === 'psu' || item.category === 'os' || item.category === 'case') {
      continue;
    }

    const declared = item.component.tdp_watts;
    const wattsEach = declared ?? CATEGORY_POWER_DEFAULTS[item.category] ?? 0;
    if (wattsEach === 0) continue;

    lineItems.push({
      category: item.category,
      name: `${item.component.brand} ${item.component.model}`,
      quantity: item.quantity,
      wattsEach,
      watts: wattsEach * item.quantity,
      estimated: declared === null || declared === undefined,
    });
  }

  const componentWatts = lineItems.reduce((sum, line) => sum + line.watts, 0);
  const estimatedWatts = componentWatts > 0 ? componentWatts + SYSTEM_OVERHEAD_WATTS : 0;

  const psuItem = build.find((item) => item.category === 'psu');
  const selectedPsuWatts = psuItem?.component.psu_wattage ?? null;

  // The recommendation respects any vendor-stated minimum (GPUs publish one).
  const vendorFloor = build.reduce(
    (max, item) => Math.max(max, item.component.recommended_psu_watts ?? 0),
    0,
  );
  const headroomTarget = Math.max(estimatedWatts * PSU_HEADROOM_MULTIPLIER, vendorFloor);
  const recommendedPsuWatts = estimatedWatts > 0 ? roundUpToPsuSize(headroomTarget) : 0;

  let status: PowerEstimate['status'] = 'no-psu';
  let loadRatio: number | null = null;

  if (selectedPsuWatts !== null && selectedPsuWatts > 0) {
    loadRatio = estimatedWatts / selectedPsuWatts;
    if (estimatedWatts === 0) {
      status = 'sufficient';
    } else if (loadRatio > 1) {
      status = 'insufficient';
    } else if (loadRatio > PSU_LOAD_WARNING_THRESHOLD || selectedPsuWatts < vendorFloor) {
      status = 'tight';
    } else {
      status = 'sufficient';
    }
  }

  return {
    lineItems,
    overheadWatts: componentWatts > 0 ? SYSTEM_OVERHEAD_WATTS : 0,
    estimatedWatts,
    recommendedPsuWatts,
    selectedPsuWatts,
    loadRatio,
    status,
  };
}
