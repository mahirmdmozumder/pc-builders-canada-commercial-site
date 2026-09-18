import Link from 'next/link';
import type { Metadata } from 'next';
import { Alert, Card, CardHeader } from '@/components/ui';
import { OrderStatusBadge, PaymentStatusBadge } from '@/components/account/status-badge';
import { requireAdmin } from '@/lib/auth/session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { formatDate, formatDateTime, formatMoney } from '@/lib/utils';
import type { ActivityLogEntry, Order } from '@/types/domain';
import type { ComponentRecord } from '@/lib/catalog/types';

export const metadata: Metadata = { title: 'Dashboard' };
export const dynamic = 'force-dynamic';

/**
 * Operations dashboard.
 *
 * Deliberately no charts. With a young order book a trend line is noise, and
 * the questions that actually need answering each morning are: what is
 * waiting on me, what is running low, and what changed. Counts and lists
 * answer those directly.
 */
export default async function AdminDashboard() {
  await requireAdmin();
  const supabase = await getSupabaseServerClient();

  const [ordersResult, quotesResult, ticketsResult, customersResult, lowStockResult, activityResult] =
    await Promise.all([
      supabase!.from('orders').select('*').order('created_at', { ascending: false }).limit(200),
      supabase!.from('quotes').select('id, status').limit(500),
      supabase!.from('support_tickets').select('id, status').limit(500),
      supabase!.from('profiles').select('id', { count: 'exact', head: true }),
      supabase!.from('components').select('*').order('stock_quantity', { ascending: true }).limit(200),
      supabase!.from('activity_log').select('*').order('created_at', { ascending: false }).limit(12),
    ]);

  const orders = (ordersResult.data ?? []) as Order[];
  const quotes = (quotesResult.data ?? []) as { id: string; status: string }[];
  const tickets = (ticketsResult.data ?? []) as { id: string; status: string }[];
  const components = (lowStockResult.data ?? []) as ComponentRecord[];
  const activity = (activityResult.data ?? []) as ActivityLogEntry[];

  // Revenue counts paid orders only. Pending and failed payments are not
  // revenue, and a dashboard that says otherwise is worse than no dashboard.
  const paidOrders = orders.filter((o) => o.payment_status === 'paid');
  const revenueCents = paidOrders.reduce((sum, o) => sum + o.total_cents, 0);

  const openQuotes = quotes.filter((q) => q.status === 'new' || q.status === 'reviewing').length;
  const openTickets = tickets.filter(
    (t) => t.status === 'open' || t.status === 'in_progress' || t.status === 'waiting_customer',
  ).length;

  const needsAction = orders.filter(
    (o) =>
      o.payment_status === 'paid' &&
      !['completed', 'cancelled', 'shipped'].includes(o.status),
  );

  const lowStock = components.filter(
    (c) => c.active && c.stock_quantity <= c.low_stock_threshold,
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-ink-400">
          Figures cover the 200 most recent orders. Revenue counts confirmed payments only.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Paid orders" value={String(paidOrders.length)} href="/admin/orders" />
        <Stat label="Revenue" value={formatMoney(revenueCents, { whole: true })} />
        <Stat label="In production" value={String(needsAction.length)} href="/admin/orders" />
        <Stat label="Open quotes" value={String(openQuotes)} href="/admin/quotes" />
        <Stat label="Open tickets" value={String(openTickets)} href="/admin/support" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Stat label="Customers" value={String(customersResult.count ?? 0)} href="/admin/customers" />
        <Stat
          label="Low stock parts"
          value={String(lowStock.length)}
          href="/admin/inventory"
          tone={lowStock.length > 0 ? 'warn' : 'neutral'}
        />
      </div>

      {lowStock.length > 0 ? (
        <Alert tone="warn" title={`${lowStock.length} parts at or below their low-stock threshold`}>
          <ul className="mt-2 space-y-1">
            {lowStock.slice(0, 5).map((component) => (
              <li key={component.id} className="flex justify-between gap-4 text-sm">
                <span>
                  {component.brand} {component.model}
                </span>
                <span className="tnum shrink-0">
                  {component.stock_quantity} left (threshold {component.low_stock_threshold})
                </span>
              </li>
            ))}
          </ul>
          <Link
            href="/admin/inventory"
            className="mt-3 inline-block text-sm font-medium text-maple-400 hover:text-maple-300"
          >
            Manage inventory &rarr;
          </Link>
        </Alert>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader
            title="Recent orders"
            action={
              <Link href="/admin/orders" className="text-sm text-maple-400 hover:text-maple-300">
                All orders
              </Link>
            }
          />
          {orders.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-ink-400">No orders yet.</p>
          ) : (
            <ul className="divide-y divide-ink-700">
              {orders.slice(0, 8).map((order) => (
                <li key={order.id}>
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-ink-800"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-white">{order.order_number}</p>
                      <p className="truncate text-xs text-ink-400">
                        {order.customer_email} · {formatDate(order.created_at)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <PaymentStatusBadge status={order.payment_status} />
                      <OrderStatusBadge status={order.status} />
                      <span className="tnum w-20 text-right text-sm text-ink-200">
                        {formatMoney(order.total_cents)}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Recent activity" description="Every administrative change is recorded." />
          {activity.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-ink-400">
              Nothing logged yet. Admin actions appear here as they happen.
            </p>
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
    </div>
  );
}

function Stat({
  label,
  value,
  href,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  href?: string;
  tone?: 'neutral' | 'warn';
}) {
  const content = (
    <>
      <p className="text-xs tracking-wide text-ink-400 uppercase">{label}</p>
      <p
        className={`tnum mt-2 text-2xl font-semibold ${tone === 'warn' ? 'text-warn-400' : 'text-white'}`}
      >
        {value}
      </p>
    </>
  );

  const className =
    'block rounded-lg border border-ink-700 bg-ink-850 p-4 transition-colors hover:border-ink-600';

  return href ? (
    <Link href={href} className={className}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  );
}
