import { describe, expect, it } from 'vitest';
import {
  DEFAULT_QUANTITY_MAX,
  MULTI_SELECT,
  QUANTITY_ALLOWED,
  QUANTITY_MAX,
} from '@/components/configurator/configurator';
import { CONFIGURATOR_CATEGORIES, REQUIRED_CATEGORIES } from '@/lib/catalog/types';

/**
 * Configurator selection rules.
 *
 * These exist because the two lists below drifted apart and shipped. Case fans
 * were added to MULTI_SELECT and not to QUANTITY_ALLOWED, which produced a
 * picker offering "+ Add another case fan" but no quantity stepper — so
 * somebody wanting six of one fan had to add the same fan six times. It reached
 * production and the site owner found it.
 *
 * The lists answer different questions and are correctly separate (memory takes
 * a quantity but should not invite mixing two kits). What was missing was
 * anything checking the relationship between them.
 */
describe('configurator selection rules', () => {
  /**
   * The invariant the bug violated. If several DIFFERENT parts of a kind can be
   * chosen, then several of ONE of them must be too — anything you can have two
   * varieties of, you can want two of.
   *
   * The reverse does not hold: memory allows a quantity without allowing a
   * second kit, which is deliberate.
   */
  it('allows a quantity wherever it allows several different parts', () => {
    for (const category of MULTI_SELECT) {
      expect(
        QUANTITY_ALLOWED,
        `${category} can be added more than once but has no quantity control`,
      ).toContain(category);
    }
  });

  it('only names categories the configurator actually shows', () => {
    for (const category of [...MULTI_SELECT, ...QUANTITY_ALLOWED]) {
      expect(CONFIGURATOR_CATEGORIES, category).toContain(category);
    }
    for (const category of Object.keys(QUANTITY_MAX)) {
      expect(CONFIGURATOR_CATEGORIES).toContain(category as never);
    }
  });

  /**
   * A build takes one processor and one motherboard. Letting either be taken
   * twice would hand the compatibility engine two sockets to compare.
   */
  it('never lets a single-slot part be taken more than once', () => {
    for (const category of ['cpu', 'motherboard', 'case', 'psu', 'os'] as const) {
      expect(MULTI_SELECT, category).not.toContain(category);
      expect(QUANTITY_ALLOWED, category).not.toContain(category);
    }
  });

  it('gives case fans a ceiling a real build can reach', () => {
    expect(QUANTITY_ALLOWED).toContain('case-fan');
    expect(MULTI_SELECT).toContain('case-fan');
    // Six is an ordinary mid-tower layout, so four would still be impractical.
    expect(QUANTITY_MAX['case-fan'] ?? DEFAULT_QUANTITY_MAX).toBeGreaterThanOrEqual(6);
    // Still optional: a build is complete without extra fans.
    expect(REQUIRED_CATEGORIES).not.toContain('case-fan');
  });

  it('keeps every quantity ceiling sane', () => {
    expect(DEFAULT_QUANTITY_MAX).toBeGreaterThan(1);
    for (const [category, max] of Object.entries(QUANTITY_MAX)) {
      expect(max, category).toBeGreaterThan(DEFAULT_QUANTITY_MAX);
      // Beyond a handful it stops being a dropdown somebody scans.
      expect(max, category).toBeLessThanOrEqual(12);
    }
  });
});
