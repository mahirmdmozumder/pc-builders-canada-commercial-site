import { getSessionUser } from '@/lib/auth/session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { ticketSchema } from '@/lib/validation/schemas';
import { generateReference } from '@/lib/utils';
import { notifyAdmin } from '@/lib/email';
import {
  badRequest,
  created,
  handle,
  serviceUnavailable,
  unauthorized,
  zodErrorResponse,
} from '@/lib/api/respond';

/**
 * Opens a support ticket.
 *
 * Requires an account: a ticket thread only makes sense if the customer can
 * come back and read the reply. Anyone without an account can use the contact
 * form instead.
 */
export async function POST(request: Request) {
  return handle('POST /api/support', async () => {
    if (!isSupabaseConfigured) {
      return serviceUnavailable('Support tickets need a database connection.');
    }

    const user = await getSessionUser();
    if (!user) return unauthorized('Sign in to open a support ticket.');

    const parsed = ticketSchema.safeParse(await request.json());
    if (!parsed.success) return zodErrorResponse(parsed.error);

    const reference = generateReference('T');
    const supabase = await getSupabaseServerClient();

    const { data, error } = await supabase!
      .from('support_tickets')
      .insert({
        reference,
        user_id: user.id,
        customer_email: user.email,
        customer_name: user.profile?.full_name ?? null,
        subject: parsed.data.subject,
        category: parsed.data.category,
        description: parsed.data.description,
        priority: parsed.data.priority,
        order_id: parsed.data.order_id ?? null,
        status: 'open',
      })
      .select('id')
      .single();

    if (error || !data) {
      console.error('[support] insert failed', error?.message);
      return badRequest('Could not open that ticket.');
    }

    await notifyAdmin(
      `New support ticket ${reference}`,
      `${user.email} opened a ${parsed.data.priority} priority ticket: ${parsed.data.subject}`,
      'ticket.created',
    );

    return created({ id: (data as { id: string }).id, reference });
  });
}
