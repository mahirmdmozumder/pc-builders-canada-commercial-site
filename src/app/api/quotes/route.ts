import { getSessionUser } from '@/lib/auth/session';
import { getSupabaseAdminClient, getSupabaseServerClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { resolveBuild } from '@/lib/catalog/repository';
import { priceBuild } from '@/lib/pricing/pricing';
import { quoteSchema } from '@/lib/validation/schemas';
import { generateReference } from '@/lib/utils';
import { notifyAdmin, quoteReceivedEmail, sendEmail } from '@/lib/email';
import { created, handle, serviceUnavailable, zodErrorResponse } from '@/lib/api/respond';

/**
 * Quote requests.
 *
 * Open to guests: asking for a price should not require an account. The
 * estimate stored against the quote is recomputed from the catalogue, never
 * taken from the request body.
 */
export async function POST(request: Request) {
  return handle('POST /api/quotes', async () => {
    if (!isSupabaseConfigured) {
      return serviceUnavailable(
        'Quote requests need a database connection, which is not configured on this deployment.',
      );
    }

    const parsed = quoteSchema.safeParse(await request.json());
    if (!parsed.success) return zodErrorResponse(parsed.error);
    const input = parsed.data;

    const { build } = await resolveBuild(input.items);
    const price = priceBuild(build, { province: input.province ?? undefined });

    const user = await getSessionUser();
    const reference = generateReference('Q');

    // A guest has no session, so the insert runs with the service-role client
    // where one is available. The anon path is still gated by the RLS insert
    // policy on quotes.
    const supabase = getSupabaseAdminClient() ?? (await getSupabaseServerClient());
    if (!supabase) return serviceUnavailable('Quote requests are not available right now.');

    const { error } = await supabase.from('quotes').insert({
      reference,
      user_id: user?.id ?? null,
      customer_name: input.customer_name,
      customer_email: input.customer_email,
      customer_phone: input.customer_phone || null,
      preferred_contact: input.preferred_contact,
      province: input.province ?? null,
      build_name: input.build_name || null,
      items: input.items,
      estimated_total_cents: price.totalCents,
      customer_notes: input.customer_notes || null,
      status: 'new',
    });

    if (error) {
      console.error('[quotes] insert failed', error.message);
      return serviceUnavailable('Could not submit your request. Please try again or email us.');
    }

    const customerEmail = await sendEmail({
      to: input.customer_email,
      subject: `Quote request ${reference} received`,
      text: quoteReceivedEmail({
        name: input.customer_name,
        reference,
        estimateCents: price.totalCents,
      }),
      event: 'quote.received',
    });

    await notifyAdmin(
      `New quote ${reference} from ${input.customer_name}`,
      `${input.customer_name} <${input.customer_email}> requested a quote.\nItems: ${input.items.length}\nEstimate: $${(price.totalCents / 100).toFixed(2)}\nNotes: ${input.customer_notes ?? '(none)'}`,
      'quote.received',
    );

    return created({
      reference,
      estimated_total_cents: price.totalCents,
      // The UI tells the customer whether a confirmation actually went out.
      confirmation_email_sent: customerEmail.delivered,
    });
  });
}
