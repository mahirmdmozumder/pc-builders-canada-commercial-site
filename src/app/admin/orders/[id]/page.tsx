import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Card, CardHeader, DefinitionList } from '@/components/ui';
import { OrderStatusBadge, PaymentStatusBadge } from '@/components/account/status-badge';
import { OrderControls } from '@/components/admin/controls';
import { requireAdmin } from '@/lib/auth/session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { formatDateTime, formatMoney } from '@/lib/utils';
import type { ActivityLogEntry, Order, OrderItem } from '@/types/domain';
import { CATEGORY_LABELS, type ComponentCategory } from '@/lib/catalog/types';

export const metadata: Metadata = { title: 'Order' };
export const dynamic = 'force-dynamic';

export default async function AdminOrderPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const supabase = await getSupabaseServerClient();

  const { data: orderData } = await supabase!.from('orders').select('*').eq('id', id).maybeSingle();
  if (!orderData) notFound();
  const order = orderData as Order;

  const [itemsResult, activityResult] = await Promise.all([
    supabase!.from('order_items').select('*').eq('order_id', id),
    supabase!
      .from('activity_log')
      .select('*')
      .eq('entity_type', 'order')
      .eq('entity_id', id)
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  const items = (itemsResult.data ?? []) as OrderItem[];
  const activity = (activityResult.data ?? []) as ActivityLogEntry[];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/admin/orders" className="text-sm text-ink-400 hover:text-ink-200">
            &larr; Orders
          </Link>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">
            {order.order_number}
          </h1>
          <p className="text-sm text-ink-400">
            {order.customer_email} · placed {formatDateTime(order.created_at)}
          </p>
        </div>
        <div className="flex gap-2">
          <PaymentStatusBadge status={order.payment_status} />
          <OrderStatusBadge status={order.status} />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Items" description={`${items.length} line items`} />
            <ul className="divide-y divide-ink-700">
              {items.map((item) => (
                <li key={item.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-medium text-white">{item.name}</p>
                      <p className="text-xs text-ink-400">
                        {item.kind} · qty {item.quantity} ·{' '}
                        {formatMoney(item.unit_price_cents)} each
                      </p>
                    </div>
                    <span className="tnum shrink-0 text-sm text-ink-100">
                      {formatMoney(item.total_cents)}
                    </span>
                  </div>

                  {item.configuration?.length ? (
                    <ul className="mt-3 space-y-1 border-l border-ink-700 pl-3 text-xs text-ink-300">
                      {item.configuration.map((part) => (
                        <li key={part.component_id}>
                          <span className="text-ink-500">
                            {CATEGORY_LABELS[part.category as ComponentCategory] ?? part.category}:
                          </span>{' '}
                          <span className="font-mono">{part.component_id}</span>
                          {part.quantity > 1 ? ` x${part.quantity}` : ''}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>
          </Card>

          <div className="grid gap-6 sm:grid-cols-2">
            <Card className="p-5">
              <h2 className="text-sm font-semibold tracking-wide text-white uppercase">Totals</h2>
              <DefinitionList
                className="mt-3"
                items={[
                  { term: 'Parts', value: formatMoney(order.subtotal_cents) },
                  { term: 'Services', value: formatMoney(order.assembly_fee_cents) },
                  { term: 'Shipping', value: formatMoney(order.shipping_cents) },
                  ...order.tax_breakdown.map((tax) => ({
                    term: `${tax.label} (${(tax.rate * 100).toFixed(2)}%)`,
                    value: formatMoney(tax.amount_cents),
                  })),
                  { term: 'Total', value: formatMoney(order.total_cents) },
                ]}
              />
            </Card>

            <Card className="p-5">
              <h2 className="text-sm font-semibold tracking-wide text-white uppercase">
                Customer &amp; payment
              </h2>
              <DefinitionList
                className="mt-3"
                items={[
                  { term: 'Email', value: order.customer_email },
                  { term: 'Name', value: order.customer_name ?? '—' },
                  { term: 'Province', value: order.province },
                  {
                    term: 'Stripe payment',
                    value: order.stripe_payment_intent_id ? (
                      <span className="font-mono text-xs">{order.stripe_payment_intent_id}</span>
                    ) : (
                      '—'
                    ),
                  },
                ]}
              />
              {order.shipping_address ? (
                <address className="mt-4 border-t border-ink-700 pt-4 text-sm leading-relaxed text-ink-200 not-italic">
                  {order.shipping_address.line1}
                  <br />
                  {order.shipping_address.line2 ? (
                    <>
                      {order.shipping_address.line2}
                      <br />
                    </>
                  ) : null}
                  {order.shipping_address.city}, {order.shipping_address.province}{' '}
                  {order.shipping_address.postal_code}
                </address>
              ) : null}
            </Card>
          </div>

          <Card>
            <CardHeader title="History" />
            {activity.length === 0 ? (
              <p className="px-5 py-6 text-sm text-ink-400">No changes recorded yet.</p>
            ) : (
              <ul className="divide-y divide-ink-700">
                {activity.map((entry) => (
                  <li key={entry.id} className="px-5 py-3">
                    <p className="text-sm text-ink-100">{entry.summary}</p>
                    <p className="mt-0.5 text-xs text-ink-500">
                      {entry.actor_email ?? 'system'} · {formatDateTime(entry.created_at)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <OrderControls order={order} />
      </div>
    </div>
  );
}
