import { getSessionUser } from '@/lib/auth/session';
import { getSupabaseAdminClient, getSupabaseServerClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { posInterestSchema } from '@/lib/validation/schemas';
import { generateReference } from '@/lib/utils';
import { notifyAdmin, sendEmail } from '@/lib/email';
import { created, handle, serviceUnavailable, zodErrorResponse } from '@/lib/api/respond';

/**
 * A restaurant registering interest in PBC POS.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS WRITES TO `quotes`
 * ---------------------------------------------------------------------------
 * It is the same thing a PC quote request is: somebody asking to be contacted
 * about something they might buy. Giving it its own table would mean a second
 * admin screen, a second status flow and a second place to forget to look —
 * for a form with five fields.
 *
 * So it becomes a quote row with no configuration attached, which the table
 * already supports, and lands in /admin/quotes beside everything else. The
 * reference is prefixed `POS-` and `build_name` names the restaurant, so the
 * existing list shows what it is without a column being added.
 *
 * Open to guests, like the quote route next door. Asking about a product should
 * not require an account, least of all for a product that does not exist yet.
 */
export async function POST(request: Request) {
  return handle('POST /api/pos-interest', async () => {
    if (!isSupabaseConfigured) {
      return serviceUnavailable(
        'This form needs a database connection, which is not configured on this deployment.',
      );
    }

    const parsed = posInterestSchema.safeParse(await request.json());
    if (!parsed.success) return zodErrorResponse(parsed.error);
    const input = parsed.data;

    const user = await getSessionUser();
    const reference = generateReference('POS');

    // Everything the restaurant told us, kept as readable text in one field.
    // Spreading it across columns the quotes table does not have would mean a
    // migration; losing it would mean a lead nobody can act on.
    const notes = [
      `Restaurant: ${input.restaurant_name}`,
      input.till_count ? `Tills wanted: ${input.till_count}` : null,
      input.current_system ? `Currently using: ${input.current_system}` : null,
      input.customer_notes ? `\n${input.customer_notes}` : null,
    ]
      .filter(Boolean)
      .join('\n');

    const supabase = getSupabaseAdminClient() ?? (await getSupabaseServerClient());
    if (!supabase) return serviceUnavailable('This form is not available right now.');

    const { error } = await supabase.from('quotes').insert({
      reference,
      user_id: user?.id ?? null,
      customer_name: input.customer_name,
      customer_email: input.customer_email,
      customer_phone: input.customer_phone || null,
      preferred_contact: input.preferred_contact,
      province: null,
      // Prefixed so the admin list reads "PBC POS — Luigi's" at a glance.
      build_name: `PBC POS — ${input.restaurant_name}`.slice(0, 80),
      items: [],
      // Zero, not a guess. The product has no price and inventing an estimate
      // would put a fictional number into the admin's pipeline totals.
      estimated_total_cents: 0,
      customer_notes: notes,
      status: 'new',
    });

    if (error) {
      console.error('[pos-interest] insert failed', error.message);
      return serviceUnavailable('Could not send that. Please try again, or email us directly.');
    }

    // Acknowledgement to the restaurant. Deliberately promises a reply and
    // nothing else -- no timeline for the product, because there isn't one.
    await sendEmail({
      to: input.customer_email,
      event: 'quote.received',
      subject: `Thanks for your interest in PBC POS (${reference})`,
      text: `Hi ${input.customer_name},

Thanks for registering interest in PBC POS for ${input.restaurant_name}.

PBC POS is still in development, so there is nothing to buy yet and no date to give you. What this does mean is that you are on the list to hear first, and that what you have told us about how ${input.restaurant_name} runs feeds into what gets built.

We will be in touch. If anything changes in the meantime, reply to this email.

Your reference is ${reference}.

PC Builders Canada`,
    });

    await notifyAdmin(
      `POS interest: ${input.restaurant_name}`,
      `${reference}\n\n${input.customer_name} <${input.customer_email}>\n${input.customer_phone ?? 'no phone'}\n\n${notes}`,
      'quote.received',
    );

    return created({ reference });
  });
}
