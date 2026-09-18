import Link from 'next/link';
import type { Metadata } from 'next';
import { Card, CardHeader, EmptyState, ButtonLink } from '@/components/ui';
import { OrderStatusBadge } from '@/components/account/status-badge';
import { requireUser } from '@/lib/auth/session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { formatDate, formatMoney } from '@/lib/utils';
import type { Order, Quote, SavedBuild } from '@/types/domain';

export const metadata: Metadata = {
  title: 'Account overview',
  robots: { index: false, follow: false },
};

export default async function AccountPage() {
  const user = await requireUser();
  const supabase = await getSupabaseServerClient();

  // Every query below runs as the signed-in user, so Row Level Security
  // restricts them to this account's rows even without an explicit filter.
  const [orders, builds, quotes] = await Promise.all([
    supabase!.from('orders').select('*').order('created_at', { ascending: false }).limit(5),
    supabase!.from('saved_builds').select('*').order('updated_at', { ascending: false }).limit(5),
    supabase!.from('quotes').select('*').order('created_at', { ascending: false }).limit(5),
  ]);

  const orderRows = (orders.data ?? []) as Order[];
  const buildRows = (builds.data ?? []) as SavedBuild[];
  const quoteRows = (quotes.data ?? []) as Quote[];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Orders" value={orderRows.length} href="/account/orders" />
        <StatCard label="Saved builds" value={buildRows.length} href="/account/builds" />
        <StatCard label="Quotes" value={quoteRows.length} href="/account/quotes" />
      </div>

      <Card>
        <CardHeader
          title="Recent orders"
          action={
            <Link href="/account/orders" className="text-sm text-maple-400 hover:text-maple-300">
              All orders
            </Link>
          }
        />
        {orderRows.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="No orders yet"
              description="When you place an order it will appear here, with its status as it moves through assembly and testing."
              action={<ButtonLink href="/build">Build your PC</ButtonLink>}
            />
          </div>
        ) : (
          <ul className="divide-y divide-ink-700">
            {orderRows.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/account/orders/${order.id}`}
                  className="flex items-center justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-ink-800"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-white">{order.order_number}</p>
                    <p className="text-xs text-ink-400">{formatDate(order.created_at)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <OrderStatusBadge status={order.status} />
                    <span className="tnum text-sm text-ink-200">
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
        <CardHeader
          title="Saved builds"
          action={
            <Link href="/account/builds" className="text-sm text-maple-400 hover:text-maple-300">
              All builds
            </Link>
          }
        />
        {buildRows.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="No saved builds"
              description="Save a configuration from the builder and it will be here next time, on any device."
              action={<ButtonLink href="/build" variant="secondary">Open the configurator</ButtonLink>}
            />
          </div>
        ) : (
          <ul className="divide-y divide-ink-700">
            {buildRows.map((build) => (
              <li key={build.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                <div className="min-w-0">
                  <p className="truncate font-medium text-white">{build.name}</p>
                  <p className="text-xs text-ink-400">
                    {build.items.length} parts · updated {formatDate(build.updated_at)}
                  </p>
                </div>
                <span className="tnum shrink-0 text-sm text-ink-200">
                  {formatMoney(build.estimated_total_cents)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <p className="text-xs text-ink-500">Signed in as {user.email}.</p>
    </div>
  );
}

function StatCard({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link
      href={href}
      className="rounded-lg border border-ink-700 bg-ink-850 p-5 transition-colors hover:border-ink-600"
    >
      <p className="text-xs tracking-wide text-ink-400 uppercase">{label}</p>
      <p className="tnum mt-2 text-3xl font-semibold text-white">{value}</p>
    </Link>
  );
}
