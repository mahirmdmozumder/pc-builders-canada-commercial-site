import { describe, expect, it } from 'vitest';
import {
  PRESET_AUDIENCES,
  isPromotionLive,
  presetHref,
  promotionState,
  type PromotionRecord,
} from '@/lib/cms/types';
import { BUILD_PRESETS } from '@/lib/catalog/presets';
import { SUGGESTED_SPECS, TYPED_FIELDS, RESERVED_SPEC_KEYS } from '@/lib/cms/spec-fields';
import { isManagedUpload, storagePathFromUrl } from '@/lib/storage/paths';
import {
  adminPromotionSchema,
  adminServiceSchema,
  adminPortfolioSchema,
} from '@/lib/validation/schemas';
import { SERVICE_CONTENT } from '@/content/services';
import { COMPONENT_CATEGORIES } from '@/lib/catalog/types';

function promo(overrides: Partial<PromotionRecord> = {}): PromotionRecord {
  return {
    id: 'p1',
    title: 'Test',
    subtitle: null,
    description: null,
    image_url: null,
    button_text: null,
    button_url: null,
    starts_at: null,
    ends_at: null,
    placement: 'home-hero',
    status: 'published',
    sort_order: 0,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

const NOW = new Date('2026-06-15T12:00:00Z');

describe('promotion scheduling', () => {
  it('shows a published promotion with no dates', () => {
    expect(isPromotionLive(promo(), NOW)).toBe(true);
  });

  it('never shows a draft, even inside its window', () => {
    const p = promo({ status: 'draft', starts_at: '2026-01-01T00:00:00Z' });
    expect(isPromotionLive(p, NOW)).toBe(false);
  });

  it('never shows an archived promotion', () => {
    expect(isPromotionLive(promo({ status: 'archived' }), NOW)).toBe(false);
  });

  it('waits for the start date', () => {
    const p = promo({ starts_at: '2026-07-01T00:00:00Z' });
    expect(isPromotionLive(p, NOW)).toBe(false);
    expect(promotionState(p, NOW).reason).toContain('Scheduled');
  });

  it('stops at the end date', () => {
    const p = promo({ ends_at: '2026-06-01T00:00:00Z' });
    expect(isPromotionLive(p, NOW)).toBe(false);
    expect(promotionState(p, NOW).reason).toContain('Expired');
  });

  it('treats the end date as exclusive', () => {
    // A promotion ending "now" has ended. The database view uses `> now()` for
    // the same reason, so the two agree.
    expect(isPromotionLive(promo({ ends_at: NOW.toISOString() }), NOW)).toBe(false);
  });

  /**
   * A published promotion can legitimately be invisible, which is confusing
   * unless the admin is told which of the two gates is holding it.
   */
  it('explains why a published promotion is not showing', () => {
    const state = promotionState(promo({ starts_at: '2026-12-01T00:00:00Z' }), NOW);
    expect(state.live).toBe(false);
    expect(state.reason).not.toBe('Live');
  });
});

describe('specification fields', () => {
  /**
   * The rule the whole editor is built around: a figure the compatibility
   * engine compares lives in a typed COLUMN, never in the free-form bag. If a
   * column name also turned up as a suggested spec key, an admin could fill in
   * the copy that the engine cannot read and the check would silently report
   * "unknown" instead of failing.
   */
  it('never suggests a spec key that is already a typed column', () => {
    const clashes: string[] = [];
    for (const category of COMPONENT_CATEGORIES) {
      const columns = new Set((TYPED_FIELDS[category] ?? []).map((f) => f.column));
      for (const key of SUGGESTED_SPECS[category] ?? []) {
        if (columns.has(key)) clashes.push(`${category}.${key}`);
      }
    }
    expect(clashes).toEqual([]);
  });

  it('never suggests a key the storefront treats specially', () => {
    const reserved = new Set<string>(RESERVED_SPEC_KEYS);
    for (const category of COMPONENT_CATEGORIES) {
      for (const key of SUGGESTED_SPECS[category] ?? []) {
        expect(reserved.has(key), `${category} suggests reserved key ${key}`).toBe(false);
      }
    }
  });

  it('gives every typed field a label and a column', () => {
    for (const category of COMPONENT_CATEGORIES) {
      for (const field of TYPED_FIELDS[category] ?? []) {
        expect(field.column.length).toBeGreaterThan(0);
        expect(field.label.length).toBeGreaterThan(0);
      }
    }
  });

  it('keeps the cooler capacity and draw as separate fields', () => {
    // Conflating them once made a 360mm AIO look like a 12W cooler.
    const columns = (TYPED_FIELDS.cooler ?? []).map((f) => f.column);
    expect(columns).toContain('cooling_capacity_watts');
    expect(columns).toContain('tdp_watts');
  });
});

describe('storage paths', () => {
  const ours =
    'https://abc.supabase.co/storage/v1/object/public/media/components/2026/abc-123.webp';

  it('extracts the object path from one of our URLs', () => {
    expect(storagePathFromUrl(ours)).toBe('components/2026/abc-123.webp');
    expect(isManagedUpload(ours)).toBe(true);
  });

  /**
   * A pasted manufacturer image must never be handed to a delete call. It is
   * not in our bucket, and treating it as ours would be a request to remove
   * somebody else's file.
   */
  it('returns null for an external image', () => {
    expect(storagePathFromUrl('https://example.com/gpu.jpg')).toBeNull();
    expect(isManagedUpload('https://example.com/gpu.jpg')).toBe(false);
  });

  it('is safe with nothing', () => {
    expect(storagePathFromUrl(null)).toBeNull();
    expect(storagePathFromUrl(undefined)).toBeNull();
    expect(storagePathFromUrl('')).toBeNull();
  });
});

describe('content validation', () => {
  const service = {
    id: 'test-service',
    slug: 'test-service',
    name: 'Test service',
    short_description: 'Something useful, described in a sentence.',
  };

  it('accepts a minimal service', () => {
    expect(adminServiceSchema.safeParse(service).success).toBe(true);
  });

  it('defaults a new service to draft', () => {
    const parsed = adminServiceSchema.parse(service);
    // Publishing has to be a decision, not what happens when you press save.
    expect(parsed.status).toBe('draft');
  });

  it('rejects a slug with spaces or capitals', () => {
    expect(adminServiceSchema.safeParse({ ...service, slug: 'Test Service' }).success).toBe(false);
  });

  it('rejects a promotion whose end is before its start', () => {
    const result = adminPromotionSchema.safeParse({
      title: 'Sale',
      starts_at: '2026-07-01T00:00:00Z',
      ends_at: '2026-06-01T00:00:00Z',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a button with no link', () => {
    // A button that goes nowhere looks like a broken site, not a missing field.
    const result = adminPromotionSchema.safeParse({ title: 'Sale', button_text: 'Shop now' });
    expect(result.success).toBe(false);
  });

  it('accepts a promotion with no dates at all', () => {
    expect(adminPromotionSchema.safeParse({ title: 'Always on' }).success).toBe(true);
  });

  it('requires a real summary on a portfolio build', () => {
    const base = { slug: 'a-build', title: 'A build', purpose: 'Gaming' };
    expect(adminPortfolioSchema.safeParse({ ...base, summary: 'Nice' }).success).toBe(false);
    expect(
      adminPortfolioSchema.safeParse({ ...base, summary: 'A quiet 1440p machine for a home studio.' })
        .success,
    ).toBe(true);
  });

  it('defaults a portfolio build to draft', () => {
    const parsed = adminPortfolioSchema.parse({
      slug: 'a-build',
      title: 'A build',
      purpose: 'Gaming',
      summary: 'A quiet 1440p machine for a home studio.',
    });
    expect(parsed.status).toBe('draft');
  });
});

describe('service seed content', () => {
  it('has a unique id and slug per service', () => {
    const ids = SERVICE_CONTENT.map((s) => s.id);
    const slugs = SERVICE_CONTENT.map((s) => s.slug);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('validates against the same schema the admin uses', () => {
    // The seed and the form must agree, or the migration inserts rows the
    // admin then refuses to save.
    for (const service of SERVICE_CONTENT) {
      const result = adminServiceSchema.safeParse(service);
      expect(result.success, `${service.id}: ${JSON.stringify(result.error?.issues)}`).toBe(true);
    }
  });

  it('keeps the caveats that make the services page honest', () => {
    // Several services say plainly when the work is not worth buying. Losing
    // those in the move to the database would change what the page claims.
    const withNotes = SERVICE_CONTENT.filter((s) => s.note);
    expect(withNotes.length).toBeGreaterThanOrEqual(3);
  });
});

describe('presetHref', () => {
  /**
   * Every preset used to live under /pre-built-gaming-pcs/, workstations
   * included, so /pre-built-gaming-pcs/creator-workstation was a page whose own
   * title read "Workstation PC". The address was hand-built in six places,
   * which is why it could not simply be made audience-aware in one.
   */
  it('puts a workstation under /workstations', () => {
    expect(presetHref({ slug: 'creator-workstation', audience: 'workstation' })).toBe(
      '/workstations/creator-workstation',
    );
  });

  it('keeps a gaming machine under /pre-built-gaming-pcs', () => {
    // Kept rather than replaced with something neutral: "pre-built gaming pcs"
    // is the phrase people search, and there is no reason to give it up.
    expect(presetHref({ slug: 'gaming-4k', audience: 'gaming' })).toBe(
      '/pre-built-gaming-pcs/gaming-4k',
    );
  });

  it('never puts a workstation under a gaming path', () => {
    for (const preset of BUILD_PRESETS) {
      const href = presetHref(preset);
      if (preset.audience === 'workstation') {
        expect(href).not.toContain('gaming');
      }
      // And the slug always survives, so no link silently points at a list page.
      expect(href.endsWith(`/${preset.slug}`)).toBe(true);
    }
  });

  it('has a path for every audience the schema allows', () => {
    // A new audience value would otherwise produce `undefined/slug`, which is a
    // link that 404s rather than a type error.
    for (const audience of PRESET_AUDIENCES) {
      const href = presetHref({ slug: 'x', audience });
      expect(href).toBe(`${href.replace('/x', '')}/x`);
      expect(href).not.toContain('undefined');
      expect(href.startsWith('/')).toBe(true);
    }
  });

  it('covers both audiences in the real preset set', () => {
    // If this ever fails it means the fallback presets stopped exercising both
    // routes, and the redirect behaviour would go untested by the build.
    const audiences = new Set(BUILD_PRESETS.map((p) => p.audience));
    expect(audiences).toEqual(new Set(['gaming', 'workstation']));
  });
});
