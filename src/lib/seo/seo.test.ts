import { describe, expect, it } from 'vitest';
import { localBusinessSchema, organizationSchema, SERVICE_AREAS } from '@/lib/seo/business';
import { SERVICE_CONTENT } from '@/content/services';
import { CHANNELS, HOURS, HOURS_PUBLISHED } from '@/content/business';

/**
 * Guards against the failure mode that actually hurts: structured data that
 * claims something the business cannot back up.
 *
 * Fake ratings, invented addresses and hours nobody keeps are the fields
 * Google issues manual actions over, and they are easy to add by accident
 * while filling in a schema template.
 */
describe('local business schema', () => {
  const schema = localBusinessSchema() as Record<string, unknown>;

  it('never claims a postal address', () => {
    // There is no storefront. A service-area business must not invent one.
    expect(schema.address).toBeUndefined();
  });

  /**
   * Hours are now published, so the test changed from "never claims hours" to
   * "claims exactly the hours the site displays". The original assertion was
   * correct when none existed; keeping it would have meant either a failing
   * suite or hours that never reach the markup.
   *
   * What must stay true is that the schema and the visible page cannot disagree,
   * because they read the same table. A mismatch between marked-up hours and
   * displayed hours is the thing Google acts on.
   */
  it('declares exactly the hours the site publishes, and no closed days', () => {
    const spec = schema.openingHoursSpecification as
      | { dayOfWeek: string; opens: string; closes: string }[]
      | undefined;

    if (!HOURS_PUBLISHED) {
      expect(spec).toBeUndefined();
      return;
    }

    const open = HOURS.filter((day) => day.opens && day.closes);
    expect(spec).toHaveLength(open.length);

    for (const day of HOURS) {
      const entry = spec!.find((s) => s.dayOfWeek.endsWith(day.day));
      if (day.opens && day.closes) {
        expect(entry, `${day.day} is open but missing from the markup`).toBeDefined();
        expect(entry!.opens).toBe(day.opens);
        expect(entry!.closes).toBe(day.closes);
      } else {
        // A closed day is omitted, not emitted with null times. A
        // specification with no opening time is malformed markup.
        expect(entry, `${day.day} is closed but present in the markup`).toBeUndefined();
      }
    }
  });

  it('never uses the vague openingHours string form', () => {
    // openingHours takes free text like "Mo-Sa 10:00-20:00" and is far easier to
    // get subtly wrong than the structured form.
    expect(schema.openingHours).toBeUndefined();
  });

  it('never claims a rating or review count', () => {
    // The most penalised piece of fake schema there is.
    expect(schema.aggregateRating).toBeUndefined();
    expect(schema.review).toBeUndefined();
    expect(schema.reviewCount).toBeUndefined();
  });

  it('only lists social profiles that are actually configured', () => {
    const configured = [CHANNELS.instagram, CHANNELS.facebook, CHANNELS.googleProfileUrl].filter(
      Boolean,
    );
    if (configured.length === 0) {
      expect(schema.sameAs).toBeUndefined();
    } else {
      expect(schema.sameAs).toHaveLength(configured.length);
    }
  });

  it('declares a service area instead of a location', () => {
    expect(Array.isArray(schema.areaServed)).toBe(true);
    expect((schema.areaServed as unknown[]).length).toBe(SERVICE_AREAS.length);
  });

  it('carries the phone number when one is configured', () => {
    if (CHANNELS.phone) {
      expect(schema.telephone).toBe(CHANNELS.phone);
    } else {
      expect(schema.telephone).toBeUndefined();
    }
  });
});

describe('organization schema', () => {
  it('is valid JSON-LD', () => {
    const json = JSON.stringify(organizationSchema());
    expect(() => JSON.parse(json)).not.toThrow();
    const parsed = JSON.parse(json);
    expect(parsed['@context']).toBe('https://schema.org');
    expect(parsed['@type']).toBe('Organization');
  });

  it('points the logo at a real asset path', () => {
    const schema = organizationSchema() as Record<string, unknown>;
    const logo = schema.logo as { url: string };
    expect(logo.url).toMatch(/\/icon\.png$/);
  });
});

describe('service FAQs', () => {
  const withFaqs = SERVICE_CONTENT.filter((s) => s.faqs?.length);

  it('exist on the services people search for', () => {
    expect(withFaqs.length).toBeGreaterThanOrEqual(8);
  });

  /**
   * Google requires a marked-up answer to be substantive and visible. A
   * one-line answer written purely to carry a keyword is the thing FAQ markup
   * gets demoted for.
   */
  it('gives every question a real answer', () => {
    for (const service of withFaqs) {
      for (const faq of service.faqs!) {
        expect(faq.question.length, `${service.id}: question too short`).toBeGreaterThan(10);
        expect(faq.answer.length, `${service.id}: "${faq.question}"`).toBeGreaterThan(60);
        expect(faq.question.endsWith('?'), `${service.id}: not a question`).toBe(true);
      }
    }
  });

  it('has no duplicate questions within a service', () => {
    for (const service of withFaqs) {
      const questions = service.faqs!.map((f) => f.question);
      expect(new Set(questions).size).toBe(questions.length);
    }
  });
});

describe('service slugs', () => {
  it('are URL-safe, because they become page addresses', () => {
    for (const service of SERVICE_CONTENT) {
      expect(service.slug, service.id).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it('are unique', () => {
    const slugs = SERVICE_CONTENT.map((s) => s.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});
