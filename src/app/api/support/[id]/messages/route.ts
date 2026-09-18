import { getSessionUser } from '@/lib/auth/session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { ticketReplySchema } from '@/lib/validation/schemas';
import { sendEmail, ticketUpdatedEmail } from '@/lib/email';
import {
  created,
  handle,
  notFound,
  serviceUnavailable,
  unauthorized,
  zodErrorResponse,
} from '@/lib/api/respond';

/**
 * Reply to a ticket.
 *
 * Both customers and staff post here. Two rules are enforced:
 *  - `author_role` is taken from the server-side session, never the body, so
 *    a customer cannot post a message that looks like it came from us.
 *  - `is_internal` is forced to false for customers. Internal notes are an
 *    admin-only concept, and the database policy enforces it a second time.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle('POST /api/support/[id]/messages', async () => {
    if (!isSupabaseConfigured) return serviceUnavailable('Support needs a database connection.');

    const user = await getSessionUser();
    if (!user) return unauthorized();

    const { id } = await params;
    const parsed = ticketReplySchema.safeParse(await request.json());
    if (!parsed.success) return zodErrorResponse(parsed.error);

    const isAdmin = user.role === 'admin';
    const supabase = await getSupabaseServerClient();

    const { data: ticket } = await supabase!
      .from('support_tickets')
      .select('id, reference, status, customer_email')
      .eq('id', id)
      .maybeSingle();

    if (!ticket) return notFound('That ticket could not be found.');
    const typed = ticket as {
      id: string;
      reference: string;
      status: string;
      customer_email: string;
    };

    const { error } = await supabase!.from('ticket_messages').insert({
      ticket_id: id,
      author_id: user.id,
      author_role: isAdmin ? 'admin' : 'customer',
      body: parsed.data.body,
      is_internal: isAdmin ? parsed.data.is_internal : false,
    });

    if (error) {
      console.error('[support] reply failed', error.message);
      return notFound('Could not post that reply.');
    }

    // A customer reply reopens a waiting ticket; a staff reply puts the ball
    // back in the customer's court.
    const nextStatus = isAdmin
      ? parsed.data.is_internal
        ? null
        : 'waiting_customer'
      : typed.status === 'waiting_customer'
        ? 'open'
        : null;

    if (nextStatus) {
      await supabase!.from('support_tickets').update({ status: nextStatus }).eq('id', id);
    }

    if (isAdmin && !parsed.data.is_internal) {
      await sendEmail({
        to: typed.customer_email,
        subject: `Update on support ticket ${typed.reference}`,
        text: ticketUpdatedEmail({
          reference: typed.reference,
          status: 'Waiting for customer',
          reply: parsed.data.body,
        }),
        event: 'ticket.updated',
      });
    }

    return created({ posted: true });
  });
}
