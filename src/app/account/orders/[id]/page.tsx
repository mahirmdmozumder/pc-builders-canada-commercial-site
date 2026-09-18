import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Card, CardHeader, DefinitionList } from '@/components/ui';
import { OrderStatusBadge, PaymentStatusBadge } from '@/components/account/status-badge';
import { requireUser } from '@/lib/auth/session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { formatDateTime, formatMoney, cn } from '@/lib/utils';
import { ORDER_STATUS_FLOW, ORDER_STATUS_LABELS, type Order, type OrderItem } from '@/types/domain';
import { CATEGORY_LABELS, type ComponentCategory } from '@/lib/catalog/types';

export const metadata: Metadata = {
  title: 'Order detail',
  robots: { index: false, follow: false },
};

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireUser(`/account/orders/${id}`);

  const supabase = await getSupabaseServerClient();

  // No user_id filter is needed: the RLS policy on `orders` already limits
  // this to the caller's own rows. Another customer's id returns nothing.
  const { data: orderData } = await supabase!.from('orders').select('*').eq('id', id).maybeSingle();
  if (!orderData) notFound();
  const order = orderData as Order;

  const { data: itemData } = await supabase!.from('order_items').select('*').eq('order_id', id);
  const items = (itemData ?? []) as OrderItem[];

  const currentIndex = ORDER_STATUS_FLOW.indexOf(order.status);
  const cancelled = order.status === 'cancelled';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/account/orders" className="text-sm text-ink-400 hover:text-ink-200">
            &larr; All orders
          </Link>
          <h2 className="mt-1 text-2xl font-semibold text-white">{order.order_number}</h2>
          <p className="text-sm text-ink-400">Placed {formatDateTime(order.created_at)}</p>
        </div>
        <div className="flex gap-2">
          <OrderStatusBadge status={order.status} />
          <PaymentStatusBadge status={order.payment_status} />
        </div>
      </div>

      {!cancelled ? (
        <Card className="p-5">
          <h3 className="text-sm font-semibold tracking-wide text-white uppercase">Progress</h3>
          <ol className="mt-4 grid gap-2 sm:grid-cols-4 lg:grid-cols-8">
            {ORDER_STATUS_FLOW.map((status, index) => {
              const done = index <= currentIndex;
              return (
                <li key={status} className="flex items-center gap-2 sm:flex-col sm:items-start">
                  <span
                    className={cn(
                      'h-1 w-full rounded-full',
                      done ? 'bg-maple-500' : 'bg-ink-700',
                    )}
                    aria-hidden
                  />
                  <span className={cn('text-xs', done ? 'text-ink-100' : 'text-ink-500')}>
                    {ORDER_STATUS_LABELS[status]}
                  </span>
                </li>
              );
            })}
          </ol>
        </Card>
      ) : null}

      <Card>
        <CardHeader title="Items" />
        <ul className="divide-y divide-ink-700">
          {items.map((item) => (
            <li key={item.id} className="px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium text-white">{item.name}</p>
                  <p className="text-xs text-ink-400">
                    {item.kind === 'build' ? 'Custom build' : 'Component'}
                    {item.quantity > 1 ? ` · x${item.quantity}` : ''}
                  </p>
                </div>
                <span className="tnum shrink-0 text-sm text-ink-100">
                  {formatMoney(item.total_cents)}
                </span>
              </div>

              {item.configuration?.length ? (
                <details className="mt-3">
                  <summary className="cursor-pointer text-xs text-maple-400">
                    {item.configuration.length} parts as built
                  </summary>
                  <ul className="mt-2 space-y-1 text-xs text-ink-300">
                    {item.configuration.map((part) => (
                      <li key={part.component_id}>
                        <span className="text-ink-500">
                          {CATEGORY_LABELS[part.category as ComponentCategory] ?? part.category}:
                        </span>{' '}
                        {part.component_id}
                        {part.quantity > 1 ? ` x${part.quantity}` : ''}
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </li>
          ))}
        </ul>
      </Card>

      <div className="grid gap-6 sm:grid-cols-2">
        <Card className="p-5">
          <h3 className="text-sm font-semibold tracking-wide text-white uppercase">Totals</h3>
          <DefinitionList
            className="mt-3"
            items={[
              { term: 'Parts', value: formatMoney(order.subtotal_cents) },
              { term: 'Services', value: formatMoney(order.assembly_fee_cents) },
              {
                term: 'Shipping',
                value: order.shipping_cents === 0 ? 'Free' : formatMoney(order.shipping_cents),
              },
              ...order.tax_breakdown.map((tax) => ({
                term: tax.label,
                value: formatMoney(tax.amount_cents),
              })),
              { term: 'Total', value: formatMoney(order.total_cents) },
            ]}
          />
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-semibold tracking-wide text-white uppercase">Shipping</h3>
          {order.shipping_address ? (
            <address className="mt-3 text-sm leading-relaxed text-ink-200 not-italic">
              {order.shipping_address.line1}
              <br />
              {order.shipping_address.line2 ? (
                <>
                  {order.shipping_address.line2}
                  <br />
                </>
              ) : null}
              {order.shipping_address.city}, {order.shipping_address.province}
              <br />
              {order.shipping_address.postal_code}
              <br />
              {order.shipping_address.country}
            </address>
          ) : (
            <p className="mt-3 text-sm text-ink-400">
              No shipping address recorded yet. It is collected during payment.
            </p>
          )}
        </Card>
      </div>

      <p className="text-xs text-ink-500">
        Something wrong with this order?{' '}
        <Link href="/account/support" className="text-maple-400 hover:text-maple-300">
          Open a support ticket
        </Link>{' '}
        and quote {order.order_number}.
      </p>
    </div>
  );
}
