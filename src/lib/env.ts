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

function readPublic(name: string): string | undefined {
  const value = process.env[name];
  return value && value.length > 0 ? value : undefined;
}

export const env = {
  siteUrl:
    readPublic('NEXT_PUBLIC_SITE_URL') ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : 'http://localhost:3000'),

  supabaseUrl: readPublic('NEXT_PUBLIC_SUPABASE_URL'),
  supabaseAnonKey: readPublic('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  supabaseServiceRoleKey: readPublic('SUPABASE_SERVICE_ROLE_KEY'),

  stripeSecretKey: readPublic('STRIPE_SECRET_KEY'),
  stripePublishableKey: readPublic('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'),
  stripeWebhookSecret: readPublic('STRIPE_WEBHOOK_SECRET'),

  resendApiKey: readPublic('RESEND_API_KEY'),
  emailFrom: readPublic('EMAIL_FROM'),
  adminNotificationEmail: readPublic('ADMIN_NOTIFICATION_EMAIL'),
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
