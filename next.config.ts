import type { NextConfig } from 'next';

/**
 * Security headers.
 *
 * Applied to every response. Notes on the two judgement calls:
 *
 * - `script-src` includes 'unsafe-inline'. The App Router inlines the RSC
 *   payload and hydration bootstrap as inline scripts, and removing
 *   'unsafe-inline' requires a per-request nonce threaded through middleware,
 *   which makes every page dynamic and gives up static rendering. The
 *   trade-off is recorded here rather than hidden: the app renders no
 *   user-supplied HTML anywhere, so the injection surface this would defend
 *   against does not currently exist. Revisit if that changes.
 *
 * - `frame-ancestors 'none'` rather than X-Frame-Options alone, because it is
 *   the header browsers actually respect now. Both are sent.
 *
 * - `frame-src` names the video hosts as well as Stripe. See the note on that
 *   line: a product video is an iframe, and a frame-src that does not list its
 *   host produces a blocked player rather than a broken-looking one, which is
 *   harder to diagnose because nothing in the application logs it.
 */
/**
 * Exported so a test can assert it against the code that depends on it.
 *
 * Next only reads the default export from this file, so exporting this changes
 * nothing about the build. It exists because the video feature and this policy
 * were written independently and the mismatch shipped: the player was blocked on
 * the live site with a browser-level message that nothing in the application
 * logged. See next-config.test.ts.
 */
export const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://js.stripe.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' https://fonts.gstatic.com data:",
  // Supabase for data and auth, Stripe for payment session creation.
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com",
  // Stripe for the payment sheet; the two video hosts for product videos.
  //
  // The video entries are exactly the origins describeVideo() can produce and
  // nothing wider — `youtube-nocookie.com` rather than `youtube.com`, and
  // `player.vimeo.com` rather than all of Vimeo. A wildcard here would permit
  // any Google or Vimeo property to be framed on the storefront, which is a
  // much larger grant than "play the clip on this product".
  //
  // This does not weaken frame-ancestors below. That directive governs who may
  // embed THIS site; this one governs what this site may embed. They are
  // independent, and the protection against clickjacking is unchanged.
  //
  // The player is still only mounted on click (see product-gallery.tsx), so a
  // visitor who never presses play loads nothing from either host.
  [
    'frame-src',
    'https://js.stripe.com',
    'https://hooks.stripe.com',
    'https://www.youtube-nocookie.com',
    'https://player.vimeo.com',
  ].join(' '),
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  'upgrade-insecure-requests',
].join('; ');

const SECURITY_HEADERS = [
  { key: 'Content-Security-Policy', value: CSP },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
  {
    // Only meaningful over HTTPS; Vercel serves HTTPS only in production.
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
];

const nextConfig: NextConfig = {
  // Removes the X-Powered-By header. Minor, but there is no reason to
  // advertise the framework version.
  poweredByHeader: false,

  // Next writes editor scratch files into the project root on `next dev`.
  // They are not part of the application and do not belong in the repository.
  agentRules: false,

  async headers() {
    return [
      {
        source: '/:path*',
        headers: SECURITY_HEADERS,
      },
      {
        // Admin and account pages must never be cached by a shared cache.
        source: '/(admin|account)/:path*',
        headers: [
          ...SECURITY_HEADERS,
          { key: 'Cache-Control', value: 'private, no-store, max-age=0, must-revalidate' },
        ],
      },
    ];
  },
};

export default nextConfig;
