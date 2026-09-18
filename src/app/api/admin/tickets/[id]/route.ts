import { getAdminOrNull } from '@/lib/auth/session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { adminTicketUpdateSchema } from '@/lib/validation/schemas';
import { logActivity } from '@/lib/admin/activity';
import { TICKET_STATUS_LABELS, type SupportTicket } from '@/types/domain';
import { handle, notFound, ok, serviceUnavailable, zodErrorResponse } from '@/lib/api/respond';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle('PATCH /api/admin/tickets/[id]', async () => {
    if (!isSupabaseConfigured) return serviceUnavailable('Admin needs a database connection.');

    const admin = await getAdminOrNull();
    if (!admin) return notFound();

    const { id } = await params;
    const parsed = adminTicketUpdateSchema.safeParse(await request.json());
    if (!parsed.success) return zodErrorResponse(parsed.error);

    const supabase = await getSupabaseServerClient();
    const { data: existing } = await supabase!
      .from('support_tickets')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (!existing) return notFound('That ticket could not be found.');
    const ticket = existing as SupportTicket;

    const patch: Partial<SupportTicket> = {};
    if (parsed.data.status) patch.status = parsed.data.status;
    if (parsed.data.priority) patch.priority = parsed.data.priority;
    if (parsed.data.internal_notes !== undefined) patch.internal_notes = parsed.data.internal_notes;

    const { error } = await supabase!.from('support_tickets').update(patch).eq('id', id);
    if (error) return notFound('Could not update that ticket.');

    if (parsed.data.status && parsed.data.status !== ticket.status) {
      await logActivity({
        actor: admin,
        action: 'ticket.status_changed',
        entityType: 'ticket',
        entityId: id,
        summary: `${ticket.reference}: ${TICKET_STATUS_LABELS[ticket.status]} -> ${TICKET_STATUS_LABELS[parsed.data.status]}`,
      });
    }

    return ok({ updated: true });
  });
}
