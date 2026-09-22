/**
 * Environment access.
 *
 * Design decision: the application must build and run with NO external
 * services configured. That is what makes the repository clonable and the
 * public site demonstrable before Supabase and Stripe are connected.
 *
 * When a service is not configured the app degrades honestly:
 *   - Catalogue reads fall back to the local sample catalogue (clearly labelled).
 *   - Anything that needs an account (sign in, saved builds, orders) tells the
 *     visitor the feature needs a database connection, rather than pretending.
 *   - Checkout refuses to start and says payments are not configured. It never
 *     fakes a successful payment.
 */

/**
 * Treats an empty string the same as an unset variable.
 *
 * A dashboard field saved blank arrives as "" rather than undefined, and an
 * empty credential should read as "not configured", not as a configured
 * service with an empty key.
 */
function clean(value: string | undefined): string | undefined {
  return value && value.length > 0 ? value : undefined;
}

/**
 * Strips a trailing slash from a base URL.
 *
 * Every consumer builds paths by appending to this ("/checkout/success"), so a
 * value pasted with a trailing slash would produce a double slash in the
 * Stripe return URL and drop a paying customer on a broken page. Pasting a URL
 * with the slash on the end is the normal thing to do, so the code absorbs it
 * rather than relying on whoever fills in the dashboard.
 */
function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

/**
 * Every NEXT_PUBLIC_ variable below is written out in full, deliberately.
 *
 * Next.js makes these available in the browser by TEXTUALLY replacing
 * `process.env.NEXT_PUBLIC_WHATEVER` with its value while bundling. There is
 * no process environment in a browser, so the literal spelling is the whole
 * mechanism. Reading them through a helper — `process.env[name]` — cannot be
 * substituted, because the bundler has no way to know which key `name` will
 * hold. Such code works perfectly on the server and silently yields undefined
 * in the browser.
 *
 * That failure is nastier than it sounds: the server renders a page as though
 * the service were configured, then the browser rehydrates it as though it
 * were not, and the page changes in front of the visitor. It presented as
 * "Accounts are not available on this deployment" appearing on a correctly
 * configured deployment.
 *
 * So: never introduce a loop or a helper that looks these up by name. The
 * repetition below is load-bearing.
 */
export const env = {
  siteUrl: normalizeBaseUrl(
    clean(process.env.NEXT_PUBLIC_SITE_URL) ??
      (process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : 'http://localhost:3000'),
  ),

  supabaseUrl: clean(process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  supabaseServiceRoleKey: clean(process.env.SUPABASE_SERVICE_ROLE_KEY),

  stripeSecretKey: clean(process.env.STRIPE_SECRET_KEY),
  stripePublishableKey: clean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY),
  stripeWebhookSecret: clean(process.env.STRIPE_WEBHOOK_SECRET),

  resendApiKey: clean(process.env.RESEND_API_KEY),
  emailFrom: clean(process.env.EMAIL_FROM),
  adminNotificationEmail: clean(process.env.ADMIN_NOTIFICATION_EMAIL),
} as const;

export const isSupabaseConfigured = Boolean(env.supabaseUrl && env.supabaseAnonKey);

/** Service-role operations (webhooks, admin writes) need the secret key too. */
export const isSupabaseAdminConfigured = Boolean(
  env.supabaseUrl && env.supabaseServiceRoleKey,
);

export const isStripeConfigured = Boolean(env.stripeSecretKey && env.stripePublishableKey);

export const isEmailConfigured = Boolean(env.resendApiKey && env.emailFrom);

/**
 * Guards against shipping live Stripe keys from a non-production deployment.
 * Live keys outside production are a real financial risk, so this is loud.
 */
export const isStripeLiveMode = Boolean(env.stripeSecretKey?.startsWith('sk_live_'));

export function assertPaymentModeIsSafe(): void {
  if (isStripeLiveMode && process.env.VERCEL_ENV !== 'production' && process.env.NODE_ENV !== 'production') {
    throw new Error(
      'Refusing to start: a live Stripe secret key is present outside a production environment. Use test keys (sk_test_...) for development.',
    );
  }
}
