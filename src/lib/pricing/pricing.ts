import type { ResolvedBuild } from '@/lib/catalog/types';
import { calculateTax, normalizeProvince, type ProvinceCode } from '@/lib/pricing/tax';
import type { TaxLine } from '@/types/domain';

/**
 * Pricing engine.
 *
 * Every figure is derived from catalogue prices plus the service rates in
 * PRICING_CONFIG. Nothing is hard-coded per build. All money is handled as
 * integer cents; rounding happens once, at the tax step.
 *
 * Definitions used across the UI:
 *   subtotal  - hardware only
 *   services  - assembly, OS installation and any selected labour
 *   shipping  - carrier charge (free above a threshold)
 *   tax       - provincial tax on (subtotal + services + shipping)
 *   total     - estimated amount payable
 *
 * "Estimate" is the honest word for a configurator total: catalogue prices
 * move, and the price a customer is actually charged is the one quoted at
 * checkout. The UI labels it that way.
 */

export const PRICING_CONFIG = {
  /** Charged on top of assembly when an OS licence is in the build. */
  osInstallFeeCents: 4900,
  /** Orders at or above this hardware subtotal ship free. */
  freeShippingThresholdCents: 150000,
  /** Flat shipping for a full system below the free-shipping threshold. */
  systemShippingCents: 8900,
  /** Flat shipping for parts-only orders. */
  partsShippingCents: 2900,
} as const;

/**
 * Assembly, cable management, BIOS setup and burn-in testing, charged by the
 * value of the machine it is charged on.
 *
 * ---------------------------------------------------------------------------
 * WHY IT IS NOT FLAT
 * ---------------------------------------------------------------------------
 * A flat fee is regressive. $199 is under 5% of a $4,000 machine and over 20%
 * of a $900 one, so a single rate taxes the budget build hardest -- and the
 * budget build is the one a small shop competes for and wins first. The labour
 * genuinely is less on a cheaper machine: fewer parts, simpler cooling, less
 * cable routing, shorter burn-in.
 *
 * The top rate is unchanged. Only the lower bands moved, so the orders that give
 * anything up are the smallest ones.
 *
 * ---------------------------------------------------------------------------
 * CHARGED PER MACHINE, NEVER PER ORDER
 * ---------------------------------------------------------------------------
 * The band is decided by one build's own parts subtotal, not by the cart total.
 * Two $1,000 builds in one basket are two $129 fees, not two $199 fees because
 * the basket happens to total $2,000 -- which would penalise exactly the
 * customer the lower bands exist for. See priceCart.
 *
 * Bands are inclusive of their maximum: $1,500 of parts falls in the $179 band,
 * $3,000 falls in the $179 band, and $3,000.01 is the first to reach $199.
 */
export interface AssemblyFeeTier {
  /** Highest parts subtotal in this band, in cents. Null means no ceiling. */
  maxSubtotalCents: number | null;
  feeCents: number;
  /** Shown in the admin settings panel. */
  label: string;
}

export const ASSEMBLY_FEE_TIERS: AssemblyFeeTier[] = [
  { maxSubtotalCents: 149_999, feeCents: 12_900, label: 'Parts under $1,500' },
  { maxSubtotalCents: 300_000, feeCents: 17_900, label: 'Parts $1,500 to $3,000' },
  { maxSubtotalCents: null, feeCents: 19_900, label: 'Parts over $3,000' },
];

/**
 * The assembly fee for one machine, from its own parts subtotal.
 *
 * The single place this is decided. Every caller -- the configurator, the cart,
 * checkout, the preset totals and the pre-built pages -- goes through here, so a
 * change to the bands cannot reach some surfaces and not others.
 */
export function assemblyFeeFor(partsSubtotalCents: number): number {
  for (const tier of ASSEMBLY_FEE_TIERS) {
    if (tier.maxSubtotalCents === null || partsSubtotalCents <= tier.maxSubtotalCents) {
      return tier.feeCents;
    }
  }
  // Unreachable while the last tier has a null ceiling. Falling back to the top
  // rate rather than zero, because a missing fee is a silent giveaway.
  return ASSEMBLY_FEE_TIERS[ASSEMBLY_FEE_TIERS.length - 1].feeCents;
}

export interface PriceLine {
  label: string;
  amount_cents: number;
  /** Shown in a lighter weight under the label. */
  note?: string;
}

export interface PriceBreakdown {
  /** Hardware only. */
  subtotalCents: number;
  /** Assembly + OS installation + any labour lines. */
  servicesCents: number;
  serviceLines: PriceLine[];
  shippingCents: number;
  shippingIsFree: boolean;
  taxCents: number;
  taxLines: TaxLine[];
  totalCents: number;
  province: ProvinceCode;
  componentLines: PriceLine[];
}

export interface PriceOptions {
  province?: string | null;
  /**
   * A full system gets the assembly fee; a parts-only cart does not.
   * Defaults to true when the build contains a case and a motherboard.
   */
  includeAssembly?: boolean;
  /** Parts-only orders use the cheaper shipping rate. */
  shippingProfile?: 'system' | 'parts';
}

function buildLooksLikeSystem(build: ResolvedBuild): boolean {
  const categories = new Set(build.map((i) => i.category));
  return categories.has('motherboard') && categories.has('cpu');
}

export function priceBuild(build: ResolvedBuild, options: PriceOptions = {}): PriceBreakdown {
  const province = normalizeProvince(options.province);

  const componentLines: PriceLine[] = build.map((item) => ({
    label:
      item.quantity > 1
        ? `${item.component.brand} ${item.component.model} x${item.quantity}`
        : `${item.component.brand} ${item.component.model}`,
    amount_cents: item.component.price_cents * item.quantity,
  }));

  const subtotalCents = componentLines.reduce((sum, line) => sum + line.amount_cents, 0);

  const isSystem = options.includeAssembly ?? buildLooksLikeSystem(build);
  const serviceLines: PriceLine[] = [];

  if (isSystem && subtotalCents > 0) {
    serviceLines.push({
      label: 'Assembly, cable management & testing',
      amount_cents: assemblyFeeFor(subtotalCents),
      note: 'Build, BIOS configuration, thermal and stability testing',
    });
    if (build.some((item) => item.category === 'os')) {
      serviceLines.push({
        label: 'Operating system installation',
        amount_cents: PRICING_CONFIG.osInstallFeeCents,
        note: 'OS install, drivers and updates applied before shipping',
      });
    }
  }

  const servicesCents = serviceLines.reduce((sum, line) => sum + line.amount_cents, 0);

  const profile = options.shippingProfile ?? (isSystem ? 'system' : 'parts');
  const baseShipping =
    profile === 'system' ? PRICING_CONFIG.systemShippingCents : PRICING_CONFIG.partsShippingCents;
  const shippingIsFree =
    subtotalCents >= PRICING_CONFIG.freeShippingThresholdCents && subtotalCents > 0;
  const shippingCents = subtotalCents === 0 ? 0 : shippingIsFree ? 0 : baseShipping;

  const taxableCents = subtotalCents + servicesCents + shippingCents;
  const { lines: taxLines, totalCents: taxCents } = calculateTax(taxableCents, province);

  return {
    subtotalCents,
    servicesCents,
    serviceLines,
    shippingCents,
    shippingIsFree,
    taxCents,
    taxLines,
    totalCents: taxableCents + taxCents,
    province,
    componentLines,
  };
}

/** Cart-level pricing: several builds and/or loose components in one order. */
export interface CartPricingInput {
  /** Each entry is one line in the cart, already resolved against the catalogue. */
  lines: {
    kind: 'build' | 'component';
    name: string;
    unitPriceCents: number;
    quantity: number;
    /** Builds carry an assembly fee; loose components do not. */
    includesAssembly: boolean;
    includesOsInstall?: boolean;
  }[];
  province?: string | null;
}

export function priceCart(input: CartPricingInput): PriceBreakdown {
  const province = normalizeProvince(input.province);

  const componentLines: PriceLine[] = input.lines.map((line) => ({
    label: line.quantity > 1 ? `${line.name} x${line.quantity}` : line.name,
    amount_cents: line.unitPriceCents * line.quantity,
  }));
  const subtotalCents = componentLines.reduce((sum, line) => sum + line.amount_cents, 0);

  const serviceLines: PriceLine[] = [];
  // `unitPriceCents > 0` mirrors the guard priceBuild already applies to its own
  // subtotal, so the two pricing paths agree. Without it a build whose every
  // component had been removed from the catalogue -- an old saved build, say --
  // would be charged an assembly fee for assembling nothing.
  const assemblyLines = input.lines.filter(
    (l) => l.kind === 'build' && l.includesAssembly && l.unitPriceCents > 0,
  );
  const assemblyUnits = assemblyLines.reduce((sum, l) => sum + l.quantity, 0);
  if (assemblyUnits > 0) {
    // Each build is banded on ITS OWN parts subtotal -- unitPriceCents is that
    // build's hardware total -- and the results are summed. Banding on the cart
    // total would charge two modest builds at the top rate because the basket
    // added up, which is the opposite of what the lower bands are for.
    const assemblyCents = assemblyLines.reduce(
      (sum, line) => sum + assemblyFeeFor(line.unitPriceCents) * line.quantity,
      0,
    );
    serviceLines.push({
      label:
        assemblyUnits > 1
          ? `Assembly, cable management & testing x${assemblyUnits}`
          : 'Assembly, cable management & testing',
      amount_cents: assemblyCents,
      note: 'Build, BIOS configuration, thermal and stability testing',
    });
  }
  const osUnits = input.lines
    .filter((l) => l.kind === 'build' && l.includesOsInstall)
    .reduce((sum, l) => sum + l.quantity, 0);
  if (osUnits > 0) {
    serviceLines.push({
      label: osUnits > 1 ? `Operating system installation x${osUnits}` : 'Operating system installation',
      amount_cents: PRICING_CONFIG.osInstallFeeCents * osUnits,
      note: 'OS install, drivers and updates applied before shipping',
    });
  }
  const servicesCents = serviceLines.reduce((sum, line) => sum + line.amount_cents, 0);

  const hasBuild = input.lines.some((l) => l.kind === 'build');
  const baseShipping = hasBuild
    ? PRICING_CONFIG.systemShippingCents
    : PRICING_CONFIG.partsShippingCents;
  const shippingIsFree =
    subtotalCents >= PRICING_CONFIG.freeShippingThresholdCents && subtotalCents > 0;
  const shippingCents = subtotalCents === 0 ? 0 : shippingIsFree ? 0 : baseShipping;

  const taxableCents = subtotalCents + servicesCents + shippingCents;
  const { lines: taxLines, totalCents: taxCents } = calculateTax(taxableCents, province);

  return {
    subtotalCents,
    servicesCents,
    serviceLines,
    shippingCents,
    shippingIsFree,
    taxCents,
    taxLines,
    totalCents: taxableCents + taxCents,
    province,
    componentLines,
  };
}
