import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Badge, Card, CardHeader } from '@/components/ui';
import { TicketStatusBadge } from '@/components/account/status-badge';
import { TicketControls } from '@/components/admin/controls';
import { requireAdmin } from '@/lib/auth/session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { formatDateTime } from '@/lib/utils';
import { TICKET_CATEGORY_LABELS, type SupportTicket, type TicketMessage } from '@/types/domain';

export const metadata: Metadata = { title: 'Ticket' };
export const dynamic = 'force-dynamic';

export default async function AdminTicketPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const supabase = await getSupabaseServerClient();

  const { data } = await supabase!
    .from('support_tickets')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (!data) notFound();
  const ticket = data as SupportTicket;

  // Admins see the whole thread, internal notes included.
  const { data: messageData } = await supabase!
    .from('ticket_messages')
    .select('*')
    .eq('ticket_id', id)
    .order('created_at', { ascending: true });
  const messages = (messageData ?? []) as TicketMessage[];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/admin/support" className="text-sm text-ink-400 hover:text-ink-200">
            &larr; Support
          </Link>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">
            {ticket.subject}
          </h1>
          <p className="text-sm text-ink-400">
            {ticket.reference} · {ticket.customer_email} · opened{' '}
            {formatDateTime(ticket.created_at)}
          </p>
        </div>
        <div className="flex gap-2">
          <Badge tone="neutral">{TICKET_CATEGORY_LABELS[ticket.category]}</Badge>
          <TicketStatusBadge status={ticket.status} />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Conversation" />
            <div className="space-y-4 px-5 py-4">
              <div className="rounded-md border border-ink-700 bg-ink-900 p-4">
                <p className="text-xs text-ink-400">
                  <span className="font-medium text-ink-200">
                    {ticket.customer_name ?? ticket.customer_email}
                  </span>{' '}
                  · {formatDateTime(ticket.created_at)}
                </p>
                <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap text-ink-200">
                  {ticket.description}
                </p>
              </div>

              {messages.map((message) => (
                <div
                  key={message.id}
                  className={
                    message.is_internal
                      ? 'rounded-md border border-warn-500/40 bg-warn-500/5 p-4'
                      : message.author_role === 'admin'
                        ? 'rounded-md border border-maple-600/40 bg-maple-600/5 p-4'
                        : 'rounded-md border border-ink-700 bg-ink-900 p-4'
                  }
                >
                  <p className="flex flex-wrap items-center gap-2 text-xs text-ink-400">
                    <span className="font-medium text-ink-200">
                      {message.author_role === 'admin' ? 'Staff' : 'Customer'}
                    </span>
                    <span>· {formatDateTime(message.created_at)}</span>
                    {message.is_internal ? <Badge tone="warn">Internal</Badge> : null}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap text-ink-200">
                    {message.body}
                  </p>
                </div>
              ))}
            </div>
          </Card>

          {ticket.internal_notes ? (
            <Card className="p-5">
              <h2 className="text-sm font-semibold tracking-wide text-white uppercase">
                Internal notes
              </h2>
              <p className="mt-3 text-sm leading-relaxed whitespace-pre-wrap text-ink-300">
                {ticket.internal_notes}
              </p>
            </Card>
          ) : null}
        </div>

        <TicketControls ticket={ticket} />
      </div>
    </div>
  );
}
