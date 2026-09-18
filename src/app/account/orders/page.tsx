import Link from 'next/link';
import type { Metadata } from 'next';
import { ButtonLink, Card, EmptyState, TableWrap } from '@/components/ui';
import { OrderStatusBadge, PaymentStatusBadge } from '@/components/account/status-badge';
import { requireUser } from '@/lib/auth/session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { formatDate, formatMoney } from '@/lib/utils';
import type { Order } from '@/types/domain';

export const metadata: Metadata = {
  title: 'Your orders',
  robots: { index: false, follow: false },
};

export default async function OrdersPage() {
  await requireUser('/account/orders');
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase!
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });

  const orders = (data ?? []) as Order[];

  if (orders.length === 0) {
    return (
      <EmptyState
        title="No orders yet"
        description="Orders appear here once payment is confirmed, and update as the build moves through assembly and testing."
        action={<ButtonLink href="/build">Build your PC</ButtonLink>}
      />
    );
  }

  return (
    <Card className="overflow-hidden">
      <TableWrap>
        <table className="w-full text-sm">
          <caption className="sr-only">Your orders</caption>
          <thead>
            <tr className="border-b border-ink-700 text-left text-xs tracking-wide text-ink-400 uppercase">
              <th scope="col" className="px-5 py-3 font-medium">Order</th>
              <th scope="col" className="px-5 py-3 font-medium">Placed</th>
              <th scope="col" className="px-5 py-3 font-medium">Status</th>
              <th scope="col" className="px-5 py-3 font-medium">Payment</th>
              <th scope="col" className="px-5 py-3 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-700">
            {orders.map((order) => (
              <tr key={order.id} className="transition-colors hover:bg-ink-800">
                <td className="px-5 py-3.5">
                  <Link
                    href={`/account/orders/${order.id}`}
                    className="font-medium text-white hover:text-maple-400"
                  >
                    {order.order_number}
                  </Link>
                </td>
                <td className="px-5 py-3.5 whitespace-nowrap text-ink-300">
                  {formatDate(order.created_at)}
                </td>
                <td className="px-5 py-3.5"><OrderStatusBadge status={order.status} /></td>
                <td className="px-5 py-3.5"><PaymentStatusBadge status={order.payment_status} /></td>
                <td className="tnum px-5 py-3.5 text-right text-ink-100">
                  {formatMoney(order.total_cents)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableWrap>
    </Card>
  );
}
