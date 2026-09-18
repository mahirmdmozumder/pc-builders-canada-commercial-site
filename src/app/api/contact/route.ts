import { getSupabaseAdminClient, getSupabaseServerClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { contactSchema } from '@/lib/validation/schemas';
import { notifyAdmin } from '@/lib/email';
import { created, handle, serviceUnavailable, zodErrorResponse } from '@/lib/api/respond';

/**
 * Contact form.
 *
 * Open to anyone, so the message body is length-capped by the schema and the
 * row is written through a parameterised client. Nothing here is rendered as
 * HTML anywhere in the application, so a submitted message cannot become
 * script in an admin's browser.
 */
export async function POST(request: Request) {
  return handle('POST /api/contact', async () => {
    if (!isSupabaseConfigured) {
      return serviceUnavailable(
        'The contact form needs a database connection, which is not configured on this deployment.',
      );
    }

    const parsed = contactSchema.safeParse(await request.json());
    if (!parsed.success) return zodErrorResponse(parsed.error);

    const supabase = getSupabaseAdminClient() ?? (await getSupabaseServerClient());
    if (!supabase) return serviceUnavailable('The contact form is unavailable right now.');

    const { error } = await supabase.from('contact_messages').insert({
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone || null,
      subject: parsed.data.subject || null,
      message: parsed.data.message,
    });

    if (error) {
      console.error('[contact] insert failed', error.message);
      return serviceUnavailable('Could not send that message. Please try again.');
    }

    const notified = await notifyAdmin(
      `Contact form: ${parsed.data.subject || 'New message'}`,
      `From ${parsed.data.name} <${parsed.data.email}>\n\n${parsed.data.message}`,
      'contact.received',
    );

    return created({ received: true, notification_sent: notified.delivered });
  });
}
