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
      {
        /**
         * Keep the Vercel-assigned hostnames out of Google.
         *
         * -------------------------------------------------------------------
         * THE PROBLEM
         * -------------------------------------------------------------------
         * Vercel gives every project a permanent *.vercel.app address beside
         * the real domain, and it cannot be removed. So the entire site — all
         * 334 URLs in the sitemap — is served a second time from
         * pc-builders-canada-commercial-site.vercel.app, whose robots.txt says
         * Allow: /. Every per-commit preview deployment is public the same way.
         *
         * That was theoretical while Google was not crawling the site at all.
         * It stopped being theoretical the day the homepage was first crawled
         * successfully: a duplicate of a site Google is actively indexing can
         * win the canonical, and then the rankings, the favicon and the brand
         * attach to an address nobody chose.
         *
         * -------------------------------------------------------------------
         * WHY A HEADER AND NOT robots.txt
         * -------------------------------------------------------------------
         * `Disallow:` blocks CRAWLING, which is the opposite of what is needed.
         * A URL Google may not crawl is a URL on which Google cannot read any
         * instruction, so one discovered through a link elsewhere can still be
         * indexed — as a bare result with no description. Blocking the crawl
         * prevents Google from ever learning the page should not be indexed.
         *
         * `X-Robots-Tag: noindex` is fetched, read and obeyed: crawl allowed,
         * indexing refused, existing entries dropped on the next visit.
         *
         * The canonical tag on those pages already points at the real domain
         * and stays. It is a hint Google may overrule — the "Google-selected
         * canonical" field in Search Console exists precisely because it can —
         * so this is the instruction behind the hint.
         *
         * -------------------------------------------------------------------
         * PRODUCTION IS NOT AFFECTED
         * -------------------------------------------------------------------
         * The rule fires only when the request's Host header ends in
         * .vercel.app. www.pcbuilderscanada.com never matches and never
         * receives this header. Verified both ways before shipping.
         */
        source: '/:path*',
        has: [{ type: 'host', value: '(?<vercelHost>.*)\\.vercel\\.app' }],
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
    ];
  },
};

export default nextConfig;
