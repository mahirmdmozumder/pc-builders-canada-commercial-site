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

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

/**
 * Whether this business is registered to collect GST/HST.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS SWITCH EXISTS, AND WHY IT IS OFF
 * ---------------------------------------------------------------------------
 * A business under the CRA small-supplier threshold ($30,000 in taxable
 * revenue over four consecutive calendar quarters) is not required to register
 * for GST/HST. This one is not registered.
 *
 * The consequence is the part that had to be fixed in code: a business that is
 * NOT registered must not CHARGE GST/HST. There is no number to remit it
 * under, so money collected as tax is money collected for nothing. The site
 * was adding 13% on every Ontario order — $260 on a $2,000 build — with
 * nowhere for it to go.
 *
 * So tax is not calculated at all while `registered` is false. It is not
 * hidden from the total, or set to zero for display: no tax line is produced,
 * so the order record stores an empty breakdown and the customer is charged
 * subtotal plus assembly plus shipping, which is the correct amount.
 *
 * ---------------------------------------------------------------------------
 * TURNING IT ON
 * ---------------------------------------------------------------------------
 * Set `registered: true` and fill in `number`. Every province in the table
 * above starts calculating again, the cart, checkout, configurator and order
 * records all pick it up, and the number appears where receipts require it.
 * Nothing else changes — the rate table never went anywhere.
 *
 * Registration becomes mandatory once the threshold is crossed. This is a
 * developer default reflecting a stated business position, not tax advice;
 * the threshold, the timing and whether voluntary registration is worthwhile
 * (it allows input tax credits to be claimed on parts, which this business
 * currently cannot do) are questions for an accountant.
 */
export interface TaxRegistration {
  registered: boolean;
  /** CRA business number with the RT program identifier. Required on receipts once registered. */
  number: string | null;
}

export const TAX_REGISTRATION: TaxRegistration = {
  registered: false,
  number: null,
};

/**
 * Returns per-tax lines plus the rounded total, in cents.
 *
 * Returns nothing at all when the business is not registered to collect. See
 * TAX_REGISTRATION: an unregistered seller charging sales tax is the failure
 * mode this guard exists for, and it has to live here rather than in the two
 * call sites, because both of them would have to remember.
 */
export function calculateTax(
  taxableCents: number,
  province: ProvinceCode,
): { lines: TaxLine[]; totalCents: number } {
  if (!TAX_REGISTRATION.registered) {
    return { lines: [], totalCents: 0 };
  }

  const table = PROVINCE_TAXES[province];
  const lines: TaxLine[] = table.rates.map(({ label, rate }) => ({
    label,
    rate,
    amount_cents: Math.round(taxableCents * rate),
  }));
  return { lines, totalCents: lines.reduce((sum, line) => sum + line.amount_cents, 0) };
}

/**
 * The rate a province WOULD charge, ignoring registration.
 *
 * Kept separate so the rate table stays testable and so an admin-facing
 * "what would this cost once registered" figure is possible, without either
 * of those routes accidentally becoming a way to charge an unregistered tax.
 */
export function calculateTaxAtRate(
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
