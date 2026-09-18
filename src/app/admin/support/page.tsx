import Link from 'next/link';
import type { Metadata } from 'next';
import { Badge, Card, EmptyState, TableWrap } from '@/components/ui';
import { TicketStatusBadge } from '@/components/account/status-badge';
import { requireAdmin } from '@/lib/auth/session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/utils';
import { TICKET_CATEGORY_LABELS, type SupportTicket } from '@/types/domain';

export const metadata: Metadata = { title: 'Support' };
export const dynamic = 'force-dynamic';

const PRIORITY_TONE = {
  low: 'neutral',
  normal: 'neutral',
  high: 'warn',
  urgent: 'danger',
} as const;

export default async function AdminSupportPage() {
  await requireAdmin();
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase!
    .from('support_tickets')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);

  const tickets = (data ?? []) as SupportTicket[];
  const open = tickets.filter((t) => t.status !== 'closed' && t.status !== 'resolved');

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">Support</h1>
        <p className="mt-1 text-sm text-ink-400">
          {open.length} open of {tickets.length} total.
        </p>
      </div>

      {tickets.length === 0 ? (
        <EmptyState
          title="No tickets"
          description="Tickets opened by signed-in customers appear here."
        />
      ) : (
        <Card className="overflow-hidden">
          <TableWrap>
            <table className="w-full text-sm">
              <caption className="sr-only">Support tickets</caption>
              <thead>
                <tr className="border-b border-ink-700 text-left text-xs tracking-wide text-ink-400 uppercase">
                  <th scope="col" className="px-4 py-3 font-medium">
                    Ticket
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Customer
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Category
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Priority
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Opened
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-700">
                {tickets.map((ticket) => (
                  <tr key={ticket.id} className="transition-colors hover:bg-ink-800">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/support/${ticket.id}`}
                        className="font-medium text-white hover:text-maple-400"
                      >
                        {ticket.subject}
                      </Link>
                      <p className="font-mono text-xs text-ink-500">{ticket.reference}</p>
                    </td>
                    <td className="px-4 py-3 text-ink-300">{ticket.customer_email}</td>
                    <td className="px-4 py-3 text-ink-400">
                      {TICKET_CATEGORY_LABELS[ticket.category]}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={PRIORITY_TONE[ticket.priority]}>{ticket.priority}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <TicketStatusBadge status={ticket.status} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-ink-400">
                      {formatDate(ticket.created_at)}
                    </td>
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
