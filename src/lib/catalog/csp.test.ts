import { describe, expect, it } from 'vitest';
import { CSP } from '../../../next.config';
import { describeVideo } from '@/lib/catalog/types';

/**
 * The Content-Security-Policy, checked against the code that depends on it.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS TEST EXISTS
 * ---------------------------------------------------------------------------
 * A product video is an iframe. The CSP names which origins may be framed. The
 * two were written in different files at different times, they did not match, and
 * the result reached production: the player rendered, the visitor clicked it, and
 * the browser refused to load it with "This content is blocked."
 *
 * That failure is invisible from the server. No request is made, nothing is
 * logged, the page returns 200, and every automated check passes. The only signal
 * is a message in somebody else's browser — which is how it got found, by the
 * site owner rather than by us.
 *
 * So the relationship is asserted here instead: every origin describeVideo() can
 * produce must be permitted by frame-src. Adding a video provider without adding
 * its origin now fails the suite rather than the customer.
 */

function directive(name: string): string[] {
  const found = CSP.split(';')
    .map((part) => part.trim())
    .find((part) => part === name || part.startsWith(`${name} `));
  if (!found) return [];
  return found.split(/\s+/).slice(1);
}

/** Every URL shape the admin field accepts and the gallery will frame. */
const EMBEDDABLE = [
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  'https://youtu.be/dQw4w9WgXcQ',
  'https://m.youtube.com/watch?v=dQw4w9WgXcQ',
  'https://vimeo.com/123456789',
  'https://player.vimeo.com/video/123456789',
];

describe('frame-src permits every video the gallery can render', () => {
  const allowed = directive('frame-src');

  it('is a real directive, not silently absent', () => {
    // An empty frame-src would fall back to default-src 'self', which blocks
    // every third-party frame including Stripe's payment sheet.
    expect(allowed.length).toBeGreaterThan(0);
  });

  it('allows the origin of every embed URL describeVideo produces', () => {
    for (const input of EMBEDDABLE) {
      const video = describeVideo(input);
      // Guards the test itself: if describeVideo stops recognising one of these,
      // the loop would otherwise pass by checking nothing.
      expect(video, `describeVideo no longer recognises ${input}`).not.toBeNull();
      if (video!.kind !== 'embed') continue;

      const origin = new URL(video!.src).origin;
      expect(allowed, `frame-src is missing ${origin}, needed for ${input}`).toContain(origin);
    }
  });

  /**
   * A file video is a <video> element, governed by media-src (which falls back to
   * default-src here). It must NOT be quietly relying on frame-src, or a future
   * tightening of one would break the other.
   */
  it('does not need frame-src for a self-hosted video file', () => {
    const file = describeVideo('https://example.com/clip.mp4');
    expect(file?.kind).toBe('file');
  });

  /**
   * The payment sheet is the highest-consequence frame on the site. This is here
   * because the change that added the video hosts rewrote this exact line, and
   * dropping a Stripe origin would break checkout while every page still
   * returned 200.
   */
  it('still allows Stripe, so checkout keeps working', () => {
    expect(allowed).toContain('https://js.stripe.com');
    expect(allowed).toContain('https://hooks.stripe.com');
  });

  /**
   * frame-src says what this site may embed. frame-ancestors says who may embed
   * this site. Widening the first must never widen the second — that would be a
   * clickjacking hole, and the two directives are easy to confuse.
   */
  it('keeps this site unembeddable by anyone else', () => {
    expect(directive('frame-ancestors')).toEqual(["'none'"]);
  });

  it('grants named origins rather than wildcards', () => {
    for (const origin of allowed) {
      expect(origin, `${origin} is a wildcard`).not.toContain('*');
    }
  });
});
