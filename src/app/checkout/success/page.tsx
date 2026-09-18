import type { Metadata } from 'next';
import Link from 'next/link';
import { Alert, ButtonLink, Card, PageShell } from '@/components/ui';
import { getSupabaseAdminClient } from '@/lib/supabase/server';
import { formatMoney } from '@/lib/utils';
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS, type Order } from '@/types/domain';
import { ClearCartOnMount } from '@/components/checkout/clear-cart';

export const metadata: Metadata = {
  title: 'Order received',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

/**
 * Confirmation page.
 *
 * Read-only by design. It looks the order up by the Stripe session id and
 * shows whatever state the order is actually in. It does NOT mark anything
 * paid: only the signed webhook may do that. If the webhook has not landed
 * yet, the page says the payment is still being confirmed rather than
 * claiming success it cannot verify.
 */
export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id: sessionId } = await searchParams;
  const supabase = getSupabaseAdminClient();

  let order: Order | null = null;
  if (sessionId && supabase) {
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('stripe_checkout_session_id', sessionId)
      .maybeSingle();
    order = (data as Order | null) ?? null;
  }

  return (
    <PageShell className="py-16 sm:py-24">
      <ClearCartOnMount />
      <div className="mx-auto max-w-2xl">
        <Card className="p-8 text-center">
          <p className="text-xs tracking-[0.18em] text-maple-400 uppercase">Order received</p>

          {order ? (
            <>
              <h1 className="mt-3 text-3xl font-semibold text-white">{order.order_number}</h1>
              <p className="mt-4 text-ink-300">
                Thanks. Keep this order number: it identifies your build in any conversation with
                us.
              </p>

              <dl className="mt-8 divide-y divide-ink-700 text-left text-sm">
                <div className="flex justify-between py-2.5">
                  <dt className="text-ink-400">Total</dt>
                  <dd className="tnum font-medium text-white">{formatMoney(order.total_cents)}</dd>
                </div>
                <div className="flex justify-between py-2.5">
                  <dt className="text-ink-400">Payment</dt>
                  <dd className="font-medium text-white">
                    {PAYMENT_STATUS_LABELS[order.payment_status]}
                  </dd>
                </div>
                <div className="flex justify-between py-2.5">
                  <dt className="text-ink-400">Order status</dt>
                  <dd className="font-medium text-white">{ORDER_STATUS_LABELS[order.status]}</dd>
                </div>
              </dl>

              {order.payment_status === 'pending' ? (
                <Alert tone="info" className="mt-6 text-left">
                  Stripe has not confirmed this payment to us yet. Confirmation usually arrives
                  within a few seconds. Refresh in a moment, or check your email.
                </Alert>
              ) : null}
            </>
          ) : (
            <>
              <h1 className="mt-3 text-3xl font-semibold text-white">Thanks for your order</h1>
              <p className="mt-4 text-ink-300">
                We could not load the order details on this page. If you completed payment, the
                confirmation email has your order number. Contact us with it and we will pick it
                up from there.
              </p>
            </>
          )}

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <ButtonLink href="/account/orders">View your orders</ButtonLink>
            <ButtonLink href="/" variant="secondary">
              Back to the site
            </ButtonLink>
          </div>

          <p className="mt-6 text-xs text-ink-500">
            Questions about this order?{' '}
            <Link href="/contact" className="text-maple-400 hover:text-maple-300">
              Get in touch
            </Link>
            .
          </p>
        </Card>
      </div>
    </PageShell>
  );
}
