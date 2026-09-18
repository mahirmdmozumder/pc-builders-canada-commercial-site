import { getSessionUser } from '@/lib/auth/session';
import { getSupabaseAdminClient } from '@/lib/supabase/server';
import { env, isSupabaseAdminConfigured, isStripeConfigured } from '@/lib/env';
import { assertTestModeOutsideProduction, getStripe } from '@/lib/stripe/client';
import { resolveCart } from '@/lib/cart/summary';
import { checkoutSchema } from '@/lib/validation/schemas';
import { generateReference } from '@/lib/utils';
import { PROVINCE_TAXES, type ProvinceCode } from '@/lib/pricing/tax';
import {
  badRequest,
  conflict,
  handle,
  ok,
  serviceUnavailable,
  zodErrorResponse,
} from '@/lib/api/respond';
import type Stripe from 'stripe';

/**
 * Creates a Stripe Checkout session.
 *
 * Order of operations, and why:
 *
 *  1. Re-resolve and re-price the cart server-side. The client sends WHAT it
 *     wants, never what it costs.
 *  2. Refuse to continue if the cart has problems (incompatible build, out of
 *     stock). Better to stop here than to take money for something we cannot
 *     build.
 *  3. Write a `pending` order with its line snapshot BEFORE redirecting. If
 *     the customer pays and the browser dies on the way back, the webhook
 *     still has a row to mark paid.
 *  4. Hand Stripe the exact amounts we calculated, as explicit line items,
 *     so the amount charged always equals the amount shown.
 *
 * Stock is NOT decremented here — only on a confirmed payment in the webhook.
 */
export async function POST(request: Request) {
  return handle('POST /api/checkout', async () => {
    if (!isStripeConfigured) {
      return serviceUnavailable(
        'Online payment is not configured on this deployment yet. Request a quote and we will invoice you directly.',
      );
    }
    if (!isSupabaseAdminConfigured) {
      return serviceUnavailable(
        'Checkout needs a database connection, which is not configured on this deployment.',
      );
    }

    assertTestModeOutsideProduction();

    const parsed = checkoutSchema.safeParse(await request.json());
    if (!parsed.success) return zodErrorResponse(parsed.error);
    const input = parsed.data;

    const cart = await resolveCart({ lines: input.lines, province: input.province });
    if (cart.problems.length > 0) {
      return conflict(cart.problems[0]);
    }
    if (cart.lines.length === 0 || cart.price.totalCents <= 0) {
      return badRequest('Your cart is empty.');
    }

    const stripe = getStripe()!;
    const supabase = getSupabaseAdminClient()!;
    const user = await getSessionUser();
    const orderNumber = generateReference('PCB');

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        order_number: orderNumber,
        user_id: user?.id ?? null,
        customer_email: input.email,
        customer_name: input.name ?? null,
        province: input.province,
        subtotal_cents: cart.price.subtotalCents,
        assembly_fee_cents: cart.price.servicesCents,
        shipping_cents: cart.price.shippingCents,
        tax_cents: cart.price.taxCents,
        total_cents: cart.price.totalCents,
        tax_breakdown: cart.price.taxLines,
        status: 'pending',
        payment_status: 'pending',
      })
      .select('id')
      .single();

    if (orderError || !order) {
      console.error('[checkout] could not create order', orderError?.message);
      return serviceUnavailable('Could not start checkout. Please try again.');
    }

    const orderId = (order as { id: string }).id;

    const itemRows = cart.lines.map((line) => ({
      order_id: orderId,
      kind: line.kind,
      name: line.name,
      configuration: line.configuration,
      component_id: line.componentId,
      quantity: line.quantity,
      unit_price_cents: line.unitPriceCents,
      total_cents: line.totalCents,
    }));

    const { error: itemsError } = await supabase.from('order_items').insert(itemRows);
    if (itemsError) {
      console.error('[checkout] could not write order items', itemsError.message);
      return serviceUnavailable('Could not start checkout. Please try again.');
    }

    // Line items mirror the breakdown the customer saw, so the Stripe receipt
    // is itemised the same way the cart was.
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = cart.lines.map((line) => ({
      quantity: line.quantity,
      price_data: {
        currency: 'cad',
        unit_amount: line.unitPriceCents,
        product_data: {
          name: line.name,
          description:
            line.kind === 'build'
              ? line.parts.map((p) => p.name).slice(0, 8).join(', ').slice(0, 480) || undefined
              : undefined,
        },
      },
    }));

    for (const service of cart.price.serviceLines) {
      lineItems.push({
        quantity: 1,
        price_data: {
          currency: 'cad',
          unit_amount: service.amount_cents,
          product_data: { name: service.label, description: service.note },
        },
      });
    }

    if (cart.price.shippingCents > 0) {
      lineItems.push({
        quantity: 1,
        price_data: {
          currency: 'cad',
          unit_amount: cart.price.shippingCents,
          product_data: { name: 'Shipping' },
        },
      });
    }

    // Tax is added as its own line rather than through Stripe Tax: the rate
    // table in lib/pricing/tax.ts is the single source of truth for what the
    // customer was quoted, and this keeps the charge identical to the quote.
    const provinceName = PROVINCE_TAXES[input.province as ProvinceCode].name;
    for (const tax of cart.price.taxLines) {
      lineItems.push({
        quantity: 1,
        price_data: {
          currency: 'cad',
          unit_amount: tax.amount_cents,
          product_data: {
            name: `${tax.label} (${provinceName}, ${(tax.rate * 100).toFixed(3).replace(/\.?0+$/, '')}%)`,
          },
        },
      });
    }

    let session: Stripe.Checkout.Session;
    try {
      session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: lineItems,
        customer_email: input.email,
        client_reference_id: orderNumber,
        // The webhook trusts this, not the browser, to know which order paid.
        metadata: { order_id: orderId, order_number: orderNumber },
        payment_intent_data: {
          metadata: { order_id: orderId, order_number: orderNumber },
        },
        shipping_address_collection: { allowed_countries: ['CA'] },
        success_url: `${env.siteUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${env.siteUrl}/cart?checkout=cancelled`,
      });
    } catch (error) {
      console.error('[checkout] stripe session failed', error);
      await supabase
        .from('orders')
        .update({ payment_status: 'failed', status: 'cancelled' })
        .eq('id', orderId);
      return serviceUnavailable('Could not reach the payment provider. Please try again.');
    }

    await supabase
      .from('orders')
      .update({ stripe_checkout_session_id: session.id })
      .eq('id', orderId);

    return ok({ url: session.url, order_number: orderNumber });
  });
}
