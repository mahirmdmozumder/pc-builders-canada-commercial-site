import { getAdminOrNull } from '@/lib/auth/session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { adminOrderUpdateSchema } from '@/lib/validation/schemas';
import { logActivity } from '@/lib/admin/activity';
import { orderStatusEmail, sendEmail } from '@/lib/email';
import { ORDER_STATUS_LABELS, type Order } from '@/types/domain';
import {
  handle,
  notFound,
  ok,
  serviceUnavailable,
  zodErrorResponse,
} from '@/lib/api/respond';

/**
 * Admin order updates.
 *
 * Authorization is checked server-side on every call. A customer who guesses
 * this URL gets the same 404 as one who requests an order that does not
 * exist: the route never confirms what it is protecting.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle('PATCH /api/admin/orders/[id]', async () => {
    if (!isSupabaseConfigured) return serviceUnavailable('Admin needs a database connection.');

    const admin = await getAdminOrNull();
    if (!admin) return notFound();

    const { id } = await params;
    const parsed = adminOrderUpdateSchema.safeParse(await request.json());
    if (!parsed.success) return zodErrorResponse(parsed.error);

    const supabase = await getSupabaseServerClient();
    const { data: existing } = await supabase!
      .from('orders')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (!existing) return notFound('That order could not be found.');
    const order = existing as Order;

    const patch: Partial<Omit<Order, 'items'>> = {};
    if (parsed.data.status) patch.status = parsed.data.status;
    if (parsed.data.internal_notes !== undefined) patch.internal_notes = parsed.data.internal_notes;

    const { error } = await supabase!.from('orders').update(patch).eq('id', id);
    if (error) return notFound('Could not update that order.');

    if (parsed.data.status && parsed.data.status !== order.status) {
      await logActivity({
        actor: admin,
        action: 'order.status_changed',
        entityType: 'order',
        entityId: id,
        summary: `${order.order_number}: ${ORDER_STATUS_LABELS[order.status]} -> ${ORDER_STATUS_LABELS[parsed.data.status]}`,
        metadata: { from: order.status, to: parsed.data.status },
      });

      // Customers are told when their machine moves, but never see the
      // internal notes attached to the same order.
      await sendEmail({
        to: order.customer_email,
        subject: `Order ${order.order_number}: ${ORDER_STATUS_LABELS[parsed.data.status]}`,
        text: orderStatusEmail({
          orderNumber: order.order_number,
          status: ORDER_STATUS_LABELS[parsed.data.status],
        }),
        event: 'order.status_changed',
      });
    }

    if (parsed.data.internal_notes !== undefined && parsed.data.internal_notes !== order.internal_notes) {
      await logActivity({
        actor: admin,
        action: 'order.note_added',
        entityType: 'order',
        entityId: id,
        summary: `Internal note updated on ${order.order_number}`,
      });
    }

    return ok({ updated: true });
  });
}
