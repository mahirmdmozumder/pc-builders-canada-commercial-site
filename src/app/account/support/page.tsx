import type { Metadata } from 'next';
import { SupportView } from '@/components/account/support-view';
import { requireUser } from '@/lib/auth/session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import type { SupportTicket, TicketMessage } from '@/types/domain';

export const metadata: Metadata = {
  title: 'Support',
  robots: { index: false, follow: false },
};

export default async function SupportPage() {
  await requireUser('/account/support');
  const supabase = await getSupabaseServerClient();

  const { data: ticketData } = await supabase!
    .from('support_tickets')
    .select('*')
    .order('created_at', { ascending: false });

  const tickets = (ticketData ?? []) as SupportTicket[];

  // Internal notes are excluded here AND by the RLS policy on ticket_messages.
  // Two layers, because a staff note leaking to a customer is not recoverable.
  const messages: Record<string, TicketMessage[]> = {};
  if (tickets.length > 0) {
    const { data: messageData } = await supabase!
      .from('ticket_messages')
      .select('*')
      .in('ticket_id', tickets.map((t) => t.id))
      .eq('is_internal', false)
      .order('created_at', { ascending: true });

    for (const message of (messageData ?? []) as TicketMessage[]) {
      (messages[message.ticket_id] ??= []).push(message);
    }
  }

  return <SupportView tickets={tickets} messages={messages} />;
}
