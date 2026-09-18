import Link from 'next/link';
import type { Metadata } from 'next';
import { Card, EmptyState, TableWrap } from '@/components/ui';
import { OrderStatusBadge, PaymentStatusBadge } from '@/components/account/status-badge';
import { requireAdmin } from '@/lib/auth/session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { formatDate, formatMoney } from '@/lib/utils';
import { ORDER_STATUSES, ORDER_STATUS_LABELS, type Order } from '@/types/domain';

export const metadata: Metadata = { title: 'Orders' };
export const dynamic = 'force-dynamic';

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  await requireAdmin();
  const { status, q } = await searchParams;
  const supabase = await getSupabaseServerClient();

  let query = supabase!.from('orders').select('*').order('created_at', { ascending: false }).limit(200);
  if (status && ORDER_STATUSES.includes(status as Order['status'])) {
    query = query.eq('status', status as Order['status']);
  }
  if (q) {
    const term = q.replace(/[%,]/g, ' ');
    query = query.or(`order_number.ilike.%${term}%,customer_email.ilike.%${term}%`);
  }

  const { data } = await query;
  const orders = (data ?? []) as Order[];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight text-white">Orders</h1>

      <Card className="p-4">
        <form className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="sr-only" htmlFor="order-search">Search orders</label>
          <input
            id="order-search"
            name="q"
            type="search"
            defaultValue={q ?? ''}
            placeholder="Order number or email"
            className="w-full rounded-md border border-ink-600 bg-ink-900 px-3 py-2 text-sm text-ink-100 sm:max-w-xs"
          />
          <label className="sr-only" htmlFor="order-status-filter">Filter by status</label>
          <select
            id="order-status-filter"
            name="status"
            defaultValue={status ?? ''}
            className="rounded-md border border-ink-600 bg-ink-900 px-3 py-2 text-sm text-ink-100"
          >
            <option value="">All statuses</option>
            {ORDER_STATUSES.map((value) => (
              <option key={value} value={value}>{ORDER_STATUS_LABELS[value]}</option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-md bg-ink-700 px-4 py-2 text-sm font-medium text-white hover:bg-ink-600"
          >
            Apply
          </button>
          <span className="tnum ml-auto text-sm text-ink-400">{orders.length} orders</span>
        </form>
      </Card>

      {orders.length === 0 ? (
        <EmptyState title="No orders match" description="Try clearing the filters." />
      ) : (
        <Card className="overflow-hidden">
          <TableWrap>
            <table className="w-full text-sm">
              <caption className="sr-only">Orders</caption>
              <thead>
                <tr className="border-b border-ink-700 text-left text-xs tracking-wide text-ink-400 uppercase">
                  <th scope="col" className="px-4 py-3 font-medium">Order</th>
                  <th scope="col" className="px-4 py-3 font-medium">Customer</th>
                  <th scope="col" className="px-4 py-3 font-medium">Placed</th>
                  <th scope="col" className="px-4 py-3 font-medium">Payment</th>
                  <th scope="col" className="px-4 py-3 font-medium">Status</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-700">
                {orders.map((order) => (
                  <tr key={order.id} className="transition-colors hover:bg-ink-800">
                    <td className="px-4 py-3">
                      <Link href={`/admin/orders/${order.id}`} className="font-medium text-white hover:text-maple-400">
                        {order.order_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-ink-300">{order.customer_email}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-ink-400">{formatDate(order.created_at)}</td>
                    <td className="px-4 py-3"><PaymentStatusBadge status={order.payment_status} /></td>
                    <td className="px-4 py-3"><OrderStatusBadge status={order.status} /></td>
                    <td className="tnum px-4 py-3 text-right text-ink-100">{formatMoney(order.total_cents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        </Card>
      )}
    </div>
  );
}
