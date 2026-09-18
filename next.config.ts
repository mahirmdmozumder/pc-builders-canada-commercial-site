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
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://js.stripe.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' https://fonts.gstatic.com data:",
  // Supabase for data and auth, Stripe for payment session creation.
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com",
  'frame-src https://js.stripe.com https://hooks.stripe.com',
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
