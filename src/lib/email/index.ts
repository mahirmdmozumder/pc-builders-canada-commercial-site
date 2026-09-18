import { env, isEmailConfigured } from '@/lib/env';

/**
 * Transactional email.
 *
 * Deliberately a thin abstraction over one HTTP call rather than an SDK
 * dependency: the payload is three fields and swapping providers means
 * changing this file only.
 *
 * When no provider is configured, nothing is sent and the return value says
 * so (`delivered: false, reason: 'not_configured'`). Callers surface that
 * honestly — the app never tells a customer an email is on its way when no
 * mail server exists. What would have been sent is logged so it is still
 * visible during development.
 */

export type EmailEvent =
  | 'account.created'
  | 'quote.received'
  | 'quote.updated'
  | 'order.received'
  | 'order.paid'
  | 'order.status_changed'
  | 'ticket.created'
  | 'ticket.updated'
  | 'contact.received';

export interface EmailMessage {
  to: string;
  subject: string;
  /** Plain text. Kept plain on purpose: it renders everywhere and ages well. */
  text: string;
  event: EmailEvent;
  replyTo?: string;
}

export interface EmailResult {
  delivered: boolean;
  reason?: 'not_configured' | 'provider_error';
}

export async function sendEmail(message: EmailMessage): Promise<EmailResult> {
  if (!isEmailConfigured) {
    console.info(
      `[email] not configured; would have sent "${message.subject}" to ${message.to} (${message.event})`,
    );
    return { delivered: false, reason: 'not_configured' };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: env.emailFrom,
        to: [message.to],
        subject: message.subject,
        text: message.text,
        reply_to: message.replyTo,
      }),
    });

    if (!response.ok) {
      console.error('[email] provider rejected the message', response.status, await response.text());
      return { delivered: false, reason: 'provider_error' };
    }
    return { delivered: true };
  } catch (error) {
    console.error('[email] send failed', error);
    return { delivered: false, reason: 'provider_error' };
  }
}

/** Copies an operational notice to the shop, when an address is configured. */
export async function notifyAdmin(subject: string, text: string, event: EmailEvent) {
  if (!env.adminNotificationEmail) return { delivered: false, reason: 'not_configured' as const };
  return sendEmail({ to: env.adminNotificationEmail, subject, text, event });
}

// ---------------------------------------------------------------------------
// Message bodies
// ---------------------------------------------------------------------------

export function quoteReceivedEmail(params: {
  name: string;
  reference: string;
  estimateCents: number;
}) {
  return `Hi ${params.name},

Thanks for your request. We have it, and your reference is ${params.reference}.

A person reviews every quote by hand, so the reply will include the reasoning behind any part changes we suggest, not just a number.

${
  params.estimateCents > 0
    ? `The configurator estimated $${(params.estimateCents / 100).toFixed(2)} CAD for the configuration you sent, including assembly, shipping and tax. That figure is an estimate from current catalogue prices and may change.`
    : ''
}

PC Builders Canada`;
}

export function orderPaidEmail(params: {
  name: string | null;
  orderNumber: string;
  totalCents: number;
}) {
  return `Hi${params.name ? ` ${params.name}` : ''},

Payment for order ${params.orderNumber} has been confirmed: $${(params.totalCents / 100).toFixed(2)} CAD.

Next: we check the parts list, order anything not in stock, then assemble and test the machine. You will get an update each time the order changes status, and you can follow it in your account.

PC Builders Canada`;
}

export function orderStatusEmail(params: {
  orderNumber: string;
  status: string;
  note?: string | null;
}) {
  return `Order ${params.orderNumber} is now: ${params.status}.

${params.note ?? ''}

You can see the full history in your account.

PC Builders Canada`;
}

export function ticketUpdatedEmail(params: { reference: string; status: string; reply?: string }) {
  return `Your support ticket ${params.reference} has been updated. Status: ${params.status}.

${params.reply ? `\n${params.reply}\n` : ''}
Reply from your account to continue the conversation.

PC Builders Canada`;
}
