import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getStripe } from '@/lib/stripe/client';
import { getSupabaseAdminClient } from '@/lib/supabase/server';
import { env, isSupabaseAdminConfigured } from '@/lib/env';
import { orderPaidEmail, sendEmail, notifyAdmin } from '@/lib/email';

/**
 * Stripe webhook.
 *
 * This is the ONLY thing that may mark an order paid. The success page the
 * customer lands on is just a page: it can be opened, replayed or forged, so
 * it never writes payment state. Stripe signs this request, we verify the
 * signature against the endpoint secret, and only then do we trust it.
 *
 * Handlers are idempotent. Stripe retries on any non-2xx, and will happily
 * deliver the same event twice, so every write checks the current state first.
 */

export const runtime = 'nodejs';
// The raw body is required for signature verification; no parsing before it.
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const stripe = getStripe();
  if (!stripe || !env.stripeWebhookSecret) {
    console.error('[stripe] webhook called but Stripe is not configured');
    return NextResponse.json({ error: 'Not configured' }, { status: 503 });
  }
  if (!isSupabaseAdminConfigured) {
    console.error('[stripe] webhook called without a service-role database connection');
    return NextResponse.json({ error: 'Not configured' }, { status: 503 });
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  const payload = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, env.stripeWebhookSecret);
  } catch (error) {
    // An unverifiable event is either a misconfiguration or an attack. Either
    // way it must not touch order state.
    console.error('[stripe] signature verification failed', error);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleSessionCompleted(event.data.object);
        break;
      case 'checkout.session.expired':
        await handleSessionExpired(event.data.object);
        break;
      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
      case 'charge.refunded':
        await handleRefund(event.data.object);
        break;
      default:
        // Unhandled types are acknowledged so Stripe stops retrying them.
        break;
    }
  } catch (error) {
    // A 500 tells Stripe to retry, which is what we want for a transient
    // database failure.
    console.error(`[stripe] handler failed for ${event.type}`, error);
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function handleSessionCompleted(session: Stripe.Checkout.Session) {
  const supabase = getSupabaseAdminClient()!;
  const orderId = session.metadata?.order_id;
  if (!orderId) {
    console.error('[stripe] session completed without an order_id in metadata', session.id);
    return;
  }

  const { data: order } = await supabase
    .from('orders')
    .select('id, order_number, payment_status, customer_email, customer_name, total_cents')
    .eq('id', orderId)
    .maybeSingle();

  if (!order) {
    console.error('[stripe] no order matches metadata order_id', orderId);
    return;
  }

  const typed = order as {
    id: string;
    order_number: string;
    payment_status: string;
    customer_email: string;
    customer_name: string | null;
    total_cents: number;
  };

  // Idempotency: a replayed event must not decrement stock a second time.
  if (typed.payment_status === 'paid') return;

  if (!isSessionPaid(session)) return;

  const shipping = extractShippingAddress(session);

  await supabase
    .from('orders')
    .update({
      payment_status: 'paid',
      status: 'confirmed',
      stripe_payment_intent_id:
        typeof session.payment_intent === 'string'
          ? session.payment_intent
          : (session.payment_intent?.id ?? null),
      shipping_address: shipping,
      customer_name: typed.customer_name ?? session.customer_details?.name ?? null,
    })
    .eq('id', typed.id);

  const { error: stockError } = await supabase.rpc('apply_order_stock', { p_order_id: typed.id });
  if (stockError) {
    // Payment already succeeded, so this must not fail the webhook. It is
    // flagged loudly instead: stock is corrected by a human in the admin.
    console.error('[stripe] stock adjustment failed for order', typed.order_number, stockError.message);
    await supabase.from('activity_log').insert({
      action: 'inventory.adjusted',
      entity_type: 'order',
      entity_id: typed.id,
      summary: `Automatic stock adjustment failed for ${typed.order_number}; adjust inventory manually`,
      metadata: { error: stockError.message },
    });
  }

  await supabase.from('activity_log').insert({
    action: 'order.status_changed',
    entity_type: 'order',
    entity_id: typed.id,
    summary: `Payment confirmed for ${typed.order_number}`,
    metadata: { source: 'stripe_webhook', amount_cents: typed.total_cents },
  });

  await sendEmail({
    to: typed.customer_email,
    subject: `Order ${typed.order_number} confirmed`,
    text: orderPaidEmail({
      name: typed.customer_name,
      orderNumber: typed.order_number,
      totalCents: typed.total_cents,
    }),
    event: 'order.paid',
  });

  await notifyAdmin(
    `Order ${typed.order_number} paid`,
    `${typed.customer_email} paid $${(typed.total_cents / 100).toFixed(2)} for ${typed.order_number}.`,
    'order.paid',
  );
}

async function handleSessionExpired(session: Stripe.Checkout.Session) {
  const supabase = getSupabaseAdminClient()!;
  const orderId = session.metadata?.order_id;
  if (!orderId) return;

  // Only an unpaid order may be cancelled by an expiry event.
  await supabase
    .from('orders')
    .update({ payment_status: 'cancelled', status: 'cancelled' })
    .eq('id', orderId)
    .eq('payment_status', 'pending');
}

async function handlePaymentFailed(intent: Stripe.PaymentIntent) {
  const supabase = getSupabaseAdminClient()!;
  const orderId = intent.metadata?.order_id;
  if (!orderId) return;

  await supabase
    .from('orders')
    .update({ payment_status: 'failed' })
    .eq('id', orderId)
    .eq('payment_status', 'pending');
}

async function handleRefund(charge: Stripe.Charge) {
  const supabase = getSupabaseAdminClient()!;
  const intentId = typeof charge.payment_intent === 'string' ? charge.payment_intent : null;
  if (!intentId) return;

  const { data } = await supabase
    .from('orders')
    .select('id, order_number')
    .eq('stripe_payment_intent_id', intentId)
    .maybeSingle();
  if (!data) return;

  const order = data as { id: string; order_number: string };

  await supabase.from('orders').update({ payment_status: 'refunded' }).eq('id', order.id);
  await supabase.from('activity_log').insert({
    action: 'order.status_changed',
    entity_type: 'order',
    entity_id: order.id,
    summary: `Refund recorded for ${order.order_number}`,
    metadata: { amount_refunded: charge.amount_refunded, source: 'stripe_webhook' },
  });
}

/**
 * Whether a completed session actually represents money received.
 *
 * Exported so the rule can be tested directly: "session completed" is not the
 * same event as "payment succeeded", and treating them as equivalent would
 * mark unpaid orders as paid.
 */
export function isSessionPaid(session: Pick<Stripe.Checkout.Session, 'payment_status'>): boolean {
  return session.payment_status === 'paid' || session.payment_status === 'no_payment_required';
}

export function extractShippingAddress(session: Stripe.Checkout.Session) {
  const details = session.collected_information?.shipping_details ?? null;
  const address = details?.address;
  if (!address) return null;
  return {
    line1: address.line1 ?? '',
    line2: address.line2 ?? null,
    city: address.city ?? '',
    province: address.state ?? '',
    postal_code: address.postal_code ?? '',
    country: address.country ?? 'CA',
  };
}
