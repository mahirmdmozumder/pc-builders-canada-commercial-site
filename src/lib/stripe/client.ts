import Stripe from 'stripe';
import { env, isStripeConfigured, isStripeLiveMode } from '@/lib/env';

/**
 * Stripe client.
 *
 * Two safety properties matter here:
 *
 * 1. No card data ever touches this application. Customers are redirected to
 *    Stripe Checkout, which collects and stores payment details on Stripe's
 *    infrastructure. We store only Stripe's opaque session and payment-intent
 *    identifiers. That keeps card data out of scope entirely.
 *
 * 2. Test and live are kept apart. `assertTestModeOutsideProduction` refuses
 *    to create a session with a live key from a non-production deployment,
 *    so a preview build cannot take a real payment by accident.
 */

let stripe: Stripe | null = null;

export function getStripe(): Stripe | null {
  if (!isStripeConfigured) return null;
  stripe ??= new Stripe(env.stripeSecretKey!, {
    // Pinned so a Stripe-side API change cannot alter behaviour silently.
    apiVersion: '2026-08-26.dahlia',
    appInfo: { name: 'PC Builders Canada' },
  });
  return stripe;
}

export function assertTestModeOutsideProduction(): void {
  const isProduction =
    process.env.VERCEL_ENV === 'production' || process.env.NEXT_PUBLIC_ENVIRONMENT === 'production';
  if (isStripeLiveMode && !isProduction) {
    throw new Error(
      'Live Stripe key detected outside production. Refusing to create a payment session.',
    );
  }
}

export function paymentModeLabel(): 'test' | 'live' {
  return isStripeLiveMode ? 'live' : 'test';
}
