import type { Metadata } from 'next';
import { Badge, Card, EmptyState, TableWrap } from '@/components/ui';
import { requireAdmin } from '@/lib/auth/session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { formatDate, formatMoney } from '@/lib/utils';
import type { Order, Profile } from '@/types/domain';

export const metadata: Metadata = { title: 'Customers' };
export const dynamic = 'force-dynamic';

/**
 * Customer list.
 *
 * Shows only what is needed to do the job: who they are, how to reach them,
 * and their order history with us. No browsing history, no tracking, nothing
 * collected that the business does not need.
 */
export default async function AdminCustomersPage() {
  await requireAdmin();
  const supabase = await getSupabaseServerClient();

  const [profilesResult, ordersResult] = await Promise.all([
    supabase!.from('profiles').select('*').order('created_at', { ascending: false }).limit(500),
    supabase!.from('orders').select('user_id, total_cents, payment_status').limit(1000),
  ]);

  const profiles = (profilesResult.data ?? []) as Profile[];
  const orders = (ordersResult.data ?? []) as Pick<
    Order,
    'user_id' | 'total_cents' | 'payment_status'
  >[];

  const spendByUser = new Map<string, { orders: number; cents: number }>();
  for (const order of orders) {
    if (!order.user_id || order.payment_status !== 'paid') continue;
    const current = spendByUser.get(order.user_id) ?? { orders: 0, cents: 0 };
    current.orders += 1;
    current.cents += order.total_cents;
    spendByUser.set(order.user_id, current);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">Customers</h1>
        <p className="mt-1 text-sm text-ink-400">
          {profiles.length} accounts. Spend counts confirmed payments only.
        </p>
      </div>

      {profiles.length === 0 ? (
        <EmptyState
          title="No accounts yet"
          description="Customers who register on the site appear here."
        />
      ) : (
        <Card className="overflow-hidden">
          <TableWrap>
            <table className="w-full text-sm">
              <caption className="sr-only">Customer accounts</caption>
              <thead>
                <tr className="border-b border-ink-700 text-left text-xs tracking-wide text-ink-400 uppercase">
                  <th scope="col" className="px-4 py-3 font-medium">
                    Customer
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Phone
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Role
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Joined
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    Orders
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    Spend
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-700">
                {profiles.map((profile) => {
                  const stats = spendByUser.get(profile.id);
                  return (
                    <tr key={profile.id}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-white">{profile.full_name ?? 'No name set'}</p>
                        <p className="text-xs text-ink-500">{profile.email}</p>
                      </td>
                      <td className="px-4 py-3 text-ink-300">{profile.phone ?? '—'}</td>
                      <td className="px-4 py-3">
                        {profile.role === 'admin' ? (
                          <Badge tone="accent">Admin</Badge>
                        ) : (
                          <Badge tone="neutral">Customer</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-ink-400">
                        {formatDate(profile.created_at)}
                      </td>
                      <td className="tnum px-4 py-3 text-right text-ink-200">
                        {stats?.orders ?? 0}
                      </td>
                      <td className="tnum px-4 py-3 text-right text-ink-100">
                        {formatMoney(stats?.cents ?? 0)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableWrap>
        </Card>
      )}

      <p className="text-xs text-ink-500">
        Roles are changed directly in the database, deliberately. There is no button here that
        grants administrator access.
      </p>
    </div>
  );
}
