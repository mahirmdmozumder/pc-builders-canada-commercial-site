import { getAdminOrNull } from '@/lib/auth/session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { adminQuoteUpdateSchema } from '@/lib/validation/schemas';
import { logActivity } from '@/lib/admin/activity';
import { QUOTE_STATUS_LABELS, type Quote } from '@/types/domain';
import { handle, notFound, ok, serviceUnavailable, zodErrorResponse } from '@/lib/api/respond';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle('PATCH /api/admin/quotes/[id]', async () => {
    if (!isSupabaseConfigured) return serviceUnavailable('Admin needs a database connection.');

    const admin = await getAdminOrNull();
    if (!admin) return notFound();

    const { id } = await params;
    const parsed = adminQuoteUpdateSchema.safeParse(await request.json());
    if (!parsed.success) return zodErrorResponse(parsed.error);

    const supabase = await getSupabaseServerClient();
    const { data: existing } = await supabase!.from('quotes').select('*').eq('id', id).maybeSingle();
    if (!existing) return notFound('That quote could not be found.');
    const quote = existing as Quote;

    const patch: Partial<Quote> = {};
    if (parsed.data.status) patch.status = parsed.data.status;
    if (parsed.data.internal_notes !== undefined) patch.internal_notes = parsed.data.internal_notes;
    if (parsed.data.quoted_total_cents !== undefined) {
      patch.quoted_total_cents = parsed.data.quoted_total_cents;
    }

    const { error } = await supabase!.from('quotes').update(patch).eq('id', id);
    if (error) return notFound('Could not update that quote.');

    if (parsed.data.status && parsed.data.status !== quote.status) {
      await logActivity({
        actor: admin,
        action: 'quote.status_changed',
        entityType: 'quote',
        entityId: id,
        summary: `${quote.reference}: ${QUOTE_STATUS_LABELS[quote.status]} -> ${QUOTE_STATUS_LABELS[parsed.data.status]}`,
        metadata: { from: quote.status, to: parsed.data.status },
      });
    }

    return ok({ updated: true });
  });
}
