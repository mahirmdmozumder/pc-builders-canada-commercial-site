import { describe, expect, it } from 'vitest';
import {
  FAST_MOVING_CATEGORIES,
  PRICE_FRESH_DAYS,
  PRICE_FRESH_DAYS_FAST,
  PRICE_STALE_DAYS,
  PRICE_STALE_DAYS_FAST,
  describePriceCheck,
  priceCheckSortWeight,
  readPriceCheck,
  summarisePriceChecks,
} from '@/lib/catalog/price-freshness';
import { SAMPLE_COMPONENTS } from '@/lib/catalog/sample-catalog';

const NOW = new Date('2026-10-06T12:00:00.000Z');

describe('readPriceCheck', () => {
  it('reports days elapsed from a recorded date', () => {
    const check = readPriceCheck({ price_checked: '2026-09-18' }, NOW);
    expect(check.checkedOn).toBe('2026-09-18');
    expect(check.daysAgo).toBe(18);
    expect(check.freshness).toBe('fresh');
  });

  it('treats the day itself as zero days ago, not one', () => {
    expect(readPriceCheck({ price_checked: '2026-10-06' }, NOW).daysAgo).toBe(0);
  });

  // THE REGRESSION THIS MODULE EXISTS FOR.
  //
  // A graphics card sat eighteen days at a price the retailer had moved $149
  // away from. Under one flat thirty-day window it read as fresh and the report
  // said nothing, which made the whole feature decorative. It has to be flagged.
  it('flags a graphics card 18 days after its last check', () => {
    const check = readPriceCheck({ price_checked: '2026-09-18' }, NOW, 'gpu');
    expect(check.daysAgo).toBe(18);
    expect(check.freshness).not.toBe('fresh');
  });

  it('leaves a slow-moving part fresh at the same age', () => {
    // The same eighteen days on a case is genuinely fine, and crying wolf on it
    // would train somebody to ignore the banner.
    expect(readPriceCheck({ price_checked: '2026-09-18' }, NOW, 'case').freshness).toBe('fresh');
    expect(readPriceCheck({ price_checked: '2026-09-18' }, NOW, 'psu').freshness).toBe('fresh');
  });

  it('halves the window for every fast-moving category', () => {
    expect(FAST_MOVING_CATEGORIES).toEqual(['gpu', 'ram', 'storage']);
    for (const category of FAST_MOVING_CATEGORIES) {
      const at = (days: number) => {
        const d = new Date(NOW.getTime() - days * 86_400_000);
        return readPriceCheck(
          { price_checked: d.toISOString().slice(0, 10) },
          NOW,
          category,
        ).freshness;
      };
      expect(at(PRICE_FRESH_DAYS_FAST)).toBe('fresh');
      expect(at(PRICE_FRESH_DAYS_FAST + 1)).toBe('ageing');
      expect(at(PRICE_STALE_DAYS_FAST)).toBe('ageing');
      expect(at(PRICE_STALE_DAYS_FAST + 1)).toBe('stale');
    }
  });

  it('falls back to the slower window when no category is given', () => {
    const d = new Date(NOW.getTime() - 20 * 86_400_000).toISOString().slice(0, 10);
    expect(readPriceCheck({ price_checked: d }, NOW).freshness).toBe('fresh');
    expect(readPriceCheck({ price_checked: d }, NOW, null).freshness).toBe('fresh');
    expect(readPriceCheck({ price_checked: d }, NOW, 'gpu').freshness).toBe('ageing');
  });

  it('classifies on the documented thresholds', () => {
    const at = (days: number) => {
      const d = new Date(NOW.getTime() - days * 86_400_000);
      return readPriceCheck({ price_checked: d.toISOString().slice(0, 10) }, NOW).freshness;
    };
    expect(at(PRICE_FRESH_DAYS)).toBe('fresh');
    expect(at(PRICE_FRESH_DAYS + 1)).toBe('ageing');
    expect(at(PRICE_STALE_DAYS)).toBe('ageing');
    expect(at(PRICE_STALE_DAYS + 1)).toBe('stale');
  });

  // An absent date is the case that matters most: rows entered through the admin
  // often have none, and they are the ones nobody has revisited.
  it('reports unknown when no date was recorded', () => {
    for (const specs of [undefined, null, {}, { price_checked: '' }, { price_checked: '   ' }]) {
      const check = readPriceCheck(specs as Record<string, unknown> | null, NOW);
      expect(check.freshness).toBe('unknown');
      expect(check.daysAgo).toBeNull();
      expect(check.checkedOn).toBeNull();
    }
  });

  it('refuses a date it cannot parse unambiguously rather than guessing', () => {
    for (const value of [
      '10/05/26',
      '2026-10-6',
      'Oct 5 2026',
      '2026-13-01',
      '2026-02-30',
      'yesterday',
      '20261005',
    ]) {
      expect(readPriceCheck({ price_checked: value }, NOW).freshness).toBe('unknown');
    }
  });

  it('ignores a non-string value', () => {
    expect(readPriceCheck({ price_checked: 20261005 }, NOW).freshness).toBe('unknown');
    expect(readPriceCheck({ price_checked: true }, NOW).freshness).toBe('unknown');
  });

  // A future date is a typo. Reading it as stale would raise an alarm about the
  // wrong thing and bury the row behind it.
  it('clamps a future date to zero days rather than going negative', () => {
    const check = readPriceCheck({ price_checked: '2027-01-01' }, NOW);
    expect(check.daysAgo).toBe(0);
    expect(check.freshness).toBe('fresh');
  });

  it('does not shift by a day across timezones', () => {
    // Same instant, two very different local offsets. UTC parsing means the
    // elapsed-day count cannot depend on where the server happens to run.
    const early = readPriceCheck({ price_checked: '2026-09-18' }, new Date('2026-10-06T00:30:00Z'));
    const late = readPriceCheck({ price_checked: '2026-09-18' }, new Date('2026-10-06T23:30:00Z'));
    expect(early.daysAgo).toBe(18);
    expect(late.daysAgo).toBe(18);
  });
});

describe('priceCheckSortWeight', () => {
  it('puts never-recorded ahead of even the stalest dated row', () => {
    const never = readPriceCheck({}, NOW);
    const ancient = readPriceCheck({ price_checked: '2020-01-01' }, NOW);
    expect(priceCheckSortWeight(never)).toBeGreaterThan(priceCheckSortWeight(ancient));
  });

  it('orders dated rows oldest first', () => {
    const rows = ['2026-10-01', '2026-01-01', '2026-06-01'].map((d) =>
      readPriceCheck({ price_checked: d }, NOW),
    );
    const sorted = [...rows].sort((a, b) => priceCheckSortWeight(b) - priceCheckSortWeight(a));
    expect(sorted.map((r) => r.checkedOn)).toEqual(['2026-01-01', '2026-06-01', '2026-10-01']);
  });
});

describe('describePriceCheck', () => {
  it('reads naturally for the near cases', () => {
    expect(describePriceCheck(readPriceCheck({ price_checked: '2026-10-06' }, NOW))).toBe('Today');
    expect(describePriceCheck(readPriceCheck({ price_checked: '2026-10-05' }, NOW))).toBe(
      'Yesterday',
    );
    expect(describePriceCheck(readPriceCheck({ price_checked: '2026-09-18' }, NOW))).toBe(
      '18 days ago',
    );
    expect(describePriceCheck(readPriceCheck({}, NOW))).toBe('Never recorded');
  });
});

describe('summarisePriceChecks', () => {
  it('counts each bucket and totals the ones needing a look', () => {
    const checks = [
      readPriceCheck({ price_checked: '2026-10-01' }, NOW), // fresh
      readPriceCheck({ price_checked: '2026-08-20' }, NOW), // ageing
      readPriceCheck({ price_checked: '2026-01-01' }, NOW), // stale
      readPriceCheck({}, NOW), // unknown
    ];
    const summary = summarisePriceChecks(checks);
    expect(summary).toMatchObject({
      total: 4,
      fresh: 1,
      ageing: 1,
      stale: 1,
      unknown: 1,
      needsAttention: 2,
      dueRecheck: 3,
    });
  });

  // The live catalogue had zero stale and zero undated rows but eleven ageing
  // ones, the drifted graphics card among them. A banner keyed on
  // needsAttention would have shown nothing at all on that data.
  it('counts an all-ageing catalogue as due a re-check', () => {
    const checks = [
      readPriceCheck({ price_checked: '2026-09-18' }, NOW, 'gpu'),
      readPriceCheck({ price_checked: '2026-09-18' }, NOW, 'ram'),
    ];
    const summary = summarisePriceChecks(checks);
    expect(summary.needsAttention).toBe(0);
    expect(summary.dueRecheck).toBe(2);
  });

  it('handles an empty catalogue', () => {
    expect(summarisePriceChecks([])).toMatchObject({ total: 0, needsAttention: 0 });
  });
});

describe('the real catalogue', () => {
  // Guards the convention rather than the code: every seeded row that has a
  // price is supposed to carry a check date, and a row added without one would
  // silently become an unverifiable price. If this fails, the row is the bug,
  // not the test.
  //
  // Zero-price rows are exempt because there is no price to check. The only one
  // today is the "No operating system" option, which exists so a customer can
  // decline a licence; a check date on a free choice would be noise, and
  // demanding one would push somebody to invent a date to quiet a test.
  it('records a parseable price_checked on every priced seeded component', () => {
    const missing = SAMPLE_COMPONENTS.filter(
      (c) => c.price_cents > 0 && readPriceCheck(c.specs, NOW).freshness === 'unknown',
    ).map((c) => c.id);
    expect(missing).toEqual([]);
  });

  it('exempts only free rows from needing a check date', () => {
    const undated = SAMPLE_COMPONENTS.filter(
      (c) => readPriceCheck(c.specs, NOW).freshness === 'unknown',
    );
    // Every row without a date must be free. If a priced row ever lands here the
    // test above fails too, but this states the rule the exemption rests on.
    expect(undated.every((c) => c.price_cents === 0)).toBe(true);
  });
});
