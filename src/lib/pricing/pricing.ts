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
  /** Flat assembly, cable management, BIOS setup and burn-in testing charge. */
  assemblyFeeCents: 19900,
  /** Charged on top of assembly when an OS licence is in the build. */
  osInstallFeeCents: 4900,
  /** Orders at or above this hardware subtotal ship free. */
  freeShippingThresholdCents: 150000,
  /** Flat shipping for a full system below the free-shipping threshold. */
  systemShippingCents: 8900,
  /** Flat shipping for parts-only orders. */
  partsShippingCents: 2900,
} as const;

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
      amount_cents: PRICING_CONFIG.assemblyFeeCents,
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
  const assemblyUnits = input.lines
    .filter((l) => l.kind === 'build' && l.includesAssembly)
    .reduce((sum, l) => sum + l.quantity, 0);
  if (assemblyUnits > 0) {
    serviceLines.push({
      label:
        assemblyUnits > 1
          ? `Assembly, cable management & testing x${assemblyUnits}`
          : 'Assembly, cable management & testing',
      amount_cents: PRICING_CONFIG.assemblyFeeCents * assemblyUnits,
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
