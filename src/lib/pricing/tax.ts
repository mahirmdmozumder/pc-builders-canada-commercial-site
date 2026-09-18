import type { TaxLine } from '@/types/domain';

/**
 * Canadian sales tax.
 *
 * Rates are held in one table so they can be corrected in a single place when
 * a province changes them. They are applied to the full taxable amount
 * (goods + assembly labour + shipping), which is the normal treatment for a
 * good shipped within Canada.
 *
 * VERIFY BEFORE INVOICING REAL CUSTOMERS: tax rates change, and registration
 * obligations depend on where the business is established and its revenue.
 * Treat this table as the developer default, not tax advice.
 */

export type ProvinceCode =
  | 'AB'
  | 'BC'
  | 'MB'
  | 'NB'
  | 'NL'
  | 'NS'
  | 'NT'
  | 'NU'
  | 'ON'
  | 'PE'
  | 'QC'
  | 'SK'
  | 'YT';

export interface ProvinceTax {
  code: ProvinceCode;
  name: string;
  /** Component rates, applied independently to the taxable base. */
  rates: { label: string; rate: number }[];
}

export const PROVINCE_TAXES: Record<ProvinceCode, ProvinceTax> = {
  AB: { code: 'AB', name: 'Alberta', rates: [{ label: 'GST', rate: 0.05 }] },
  BC: {
    code: 'BC',
    name: 'British Columbia',
    rates: [
      { label: 'GST', rate: 0.05 },
      { label: 'PST', rate: 0.07 },
    ],
  },
  MB: {
    code: 'MB',
    name: 'Manitoba',
    rates: [
      { label: 'GST', rate: 0.05 },
      { label: 'RST', rate: 0.07 },
    ],
  },
  NB: { code: 'NB', name: 'New Brunswick', rates: [{ label: 'HST', rate: 0.15 }] },
  NL: { code: 'NL', name: 'Newfoundland and Labrador', rates: [{ label: 'HST', rate: 0.15 }] },
  NS: { code: 'NS', name: 'Nova Scotia', rates: [{ label: 'HST', rate: 0.14 }] },
  NT: { code: 'NT', name: 'Northwest Territories', rates: [{ label: 'GST', rate: 0.05 }] },
  NU: { code: 'NU', name: 'Nunavut', rates: [{ label: 'GST', rate: 0.05 }] },
  ON: { code: 'ON', name: 'Ontario', rates: [{ label: 'HST', rate: 0.13 }] },
  PE: { code: 'PE', name: 'Prince Edward Island', rates: [{ label: 'HST', rate: 0.15 }] },
  QC: {
    code: 'QC',
    name: 'Quebec',
    rates: [
      { label: 'GST', rate: 0.05 },
      { label: 'QST', rate: 0.09975 },
    ],
  },
  SK: {
    code: 'SK',
    name: 'Saskatchewan',
    rates: [
      { label: 'GST', rate: 0.05 },
      { label: 'PST', rate: 0.06 },
    ],
  },
  YT: { code: 'YT', name: 'Yukon', rates: [{ label: 'GST', rate: 0.05 }] },
};

export const PROVINCE_OPTIONS = Object.values(PROVINCE_TAXES).sort((a, b) =>
  a.name.localeCompare(b.name),
);

export const DEFAULT_PROVINCE: ProvinceCode = 'ON';

export function isProvinceCode(value: string): value is ProvinceCode {
  return value in PROVINCE_TAXES;
}

export function normalizeProvince(value: string | null | undefined): ProvinceCode {
  if (!value) return DEFAULT_PROVINCE;
  const upper = value.toUpperCase();
  return isProvinceCode(upper) ? upper : DEFAULT_PROVINCE;
}

/** Returns per-tax lines plus the rounded total, in cents. */
export function calculateTax(
  taxableCents: number,
  province: ProvinceCode,
): { lines: TaxLine[]; totalCents: number } {
  const table = PROVINCE_TAXES[province];
  const lines: TaxLine[] = table.rates.map(({ label, rate }) => ({
    label,
    rate,
    amount_cents: Math.round(taxableCents * rate),
  }));
  return { lines, totalCents: lines.reduce((sum, line) => sum + line.amount_cents, 0) };
}

export function combinedRate(province: ProvinceCode): number {
  return PROVINCE_TAXES[province].rates.reduce((sum, r) => sum + r.rate, 0);
}
