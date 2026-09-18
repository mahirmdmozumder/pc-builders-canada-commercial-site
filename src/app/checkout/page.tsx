import type { Metadata } from 'next';
import { PageHeader, PageShell } from '@/components/ui';
import { CheckoutView } from '@/components/checkout/checkout-view';
import { isStripeConfigured, isStripeLiveMode } from '@/lib/env';

export const metadata: Metadata = {
  title: 'Checkout',
  description: 'Complete your custom PC order.',
  robots: { index: false, follow: false },
};

export default function CheckoutPage() {
  return (
    <>
      <PageHeader
        eyebrow="Checkout"
        title="Complete your order"
        description="Payment is handled by Stripe. Card details never touch our servers."
      />
      <PageShell className="py-8 sm:py-10">
        <CheckoutView paymentsConfigured={isStripeConfigured} testMode={!isStripeLiveMode} />
      </PageShell>
    </>
  );
}
