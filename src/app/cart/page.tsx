import type { Metadata } from 'next';
import { PageHeader, PageShell } from '@/components/ui';
import { CartView } from '@/components/cart/cart-view';

export const metadata: Metadata = {
  title: 'Cart',
  description: 'Review your custom PC build and parts before checkout.',
  robots: { index: false, follow: false },
};

export default function CartPage() {
  return (
    <>
      <PageHeader
        eyebrow="Checkout"
        title="Your cart"
        description="Prices are recalculated on our server from the current catalogue, so what you see here is what you pay."
      />
      <PageShell className="py-8 sm:py-10">
        <CartView />
      </PageShell>
    </>
  );
}
