'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Alert, Button, ButtonLink, Card, EmptyState, Field, Input, Select } from '@/components/ui';
import { useCart, type CartLine } from '@/lib/cart/store';
import { useClientSession } from '@/lib/auth/use-session';
import { formatMoney } from '@/lib/utils';
import { useHydrated } from '@/lib/hooks/use-hydrated';
import { PROVINCE_OPTIONS } from '@/lib/pricing/tax';
import type { ResolvedCart } from '@/lib/cart/summary';

function toApiLines(lines: CartLine[]) {
  return lines.map((line) =>
    line.kind === 'build'
      ? { kind: 'build' as const, name: line.name, items: line.items, quantity: line.quantity }
      : { kind: 'component' as const, component_id: line.componentId, quantity: line.quantity },
  );
}

interface CheckoutViewProps {
  paymentsConfigured: boolean;
  testMode: boolean;
}

export function CheckoutView(props: CheckoutViewProps) {
  const hydrated = useHydrated();
  if (!hydrated) {
    return <p className="py-12 text-center text-sm text-ink-400">Loading...</p>;
  }
  return <CheckoutViewInner {...props} />;
}

function CheckoutViewInner({ paymentsConfigured, testMode }: CheckoutViewProps) {
  const lines = useCart((s) => s.lines);
  const province = useCart((s) => s.province);
  const setProvince = useCart((s) => s.setProvince);
  const { email: sessionEmail } = useClientSession();

  const [summary, setSummary] = useState<ResolvedCart | null>(null);
  // null means "not typed in yet", so the signed-in address can fill the field
  // without an effect writing state on every session change.
  const [typedEmail, setTypedEmail] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const email = typedEmail ?? sessionEmail ?? '';
  const setEmail = setTypedEmail;

  const payload = useMemo(() => JSON.stringify(toApiLines(lines)), [lines]);

  useEffect(() => {
    if (lines.length === 0) return;
    const controller = new AbortController();
    fetch('/api/cart/summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lines: JSON.parse(payload), province }),
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data) => setSummary(data as ResolvedCart))
      .catch(() => {});
    return () => controller.abort();
  }, [payload, province, lines.length]);

  async function startCheckout(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lines: toApiLines(lines),
          province,
          email,
          name: name || null,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.url) {
        setError(data.error ?? 'Could not start checkout.');
        setSubmitting(false);
        return;
      }

      // Leaves the app entirely: card details are entered on Stripe's domain.
      window.location.href = data.url as string;
    } catch {
      setError('Could not reach the server. Check your connection and try again.');
      setSubmitting(false);
    }
  }

  if (lines.length === 0) {
    return (
      <EmptyState
        title="Nothing to check out"
        description="Your cart is empty."
        action={<ButtonLink href="/build">Build your PC</ButtonLink>}
      />
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
      <Card className="p-6">
        {!paymentsConfigured ? (
          <Alert tone="warn" title="Online payment is not connected yet">
            <p>
              This deployment has no payment provider configured, so checkout cannot take a
              payment. Nothing here will charge you.
            </p>
            <p className="mt-2">
              Send the same configuration as a quote and we will reply with an invoice.
            </p>
            <Link
              href="/quote"
              className="mt-3 inline-block font-medium text-maple-400 hover:text-maple-300"
            >
              Request a quote instead &rarr;
            </Link>
          </Alert>
        ) : null}

        {testMode && paymentsConfigured ? (
          <Alert tone="info" title="Test mode" className="mb-5">
            Payments are running against Stripe test keys. Use card 4242 4242 4242 4242 with any
            future expiry date. No money moves.
          </Alert>
        ) : null}

        <form onSubmit={startCheckout} className="space-y-5">
          <h2 className="text-lg font-semibold text-white">Contact</h2>

          <Field
            label="Email"
            htmlFor="checkout-email"
            required
            hint="Order confirmation and status updates go here."
          >
            <Input
              id="checkout-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </Field>

          <Field label="Name" htmlFor="checkout-name">
            <Input
              id="checkout-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
          </Field>

          <Field
            label="Province"
            htmlFor="checkout-province"
            hint="Sets the tax rate. The shipping address is collected by Stripe on the next screen."
          >
            <Select
              id="checkout-province"
              value={province}
              onChange={(e) => setProvince(e.target.value)}
            >
              {PROVINCE_OPTIONS.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Field>

          {error ? (
            <Alert tone="danger" title="Checkout could not start">
              {error}
            </Alert>
          ) : null}

          {summary?.problems.length ? (
            <Alert tone="warn" title="Resolve these first">
              <ul className="mt-1 list-disc space-y-1 pl-5">
                {summary.problems.map((problem) => (
                  <li key={problem}>{problem}</li>
                ))}
              </ul>
            </Alert>
          ) : null}

          <div className="border-t border-ink-700 pt-5">
            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={
                submitting ||
                !paymentsConfigured ||
                !email ||
                (summary?.problems.length ?? 0) > 0
              }
            >
              {submitting ? 'Redirecting to Stripe...' : 'Pay with Stripe'}
            </Button>
            <p className="mt-3 text-xs leading-relaxed text-ink-500">
              You will be taken to Stripe to pay. Card details are entered on Stripe&apos;s systems
              and never reach ours. We store only the order and Stripe&apos;s reference for it.
            </p>
          </div>
        </form>
      </Card>

      <Card className="overflow-hidden lg:sticky lg:top-20">
        <div className="border-b border-ink-700 px-5 py-4">
          <h2 className="text-sm font-semibold tracking-wide text-white uppercase">Order</h2>
        </div>

        <ul className="divide-y divide-ink-700">
          {(summary?.lines ?? []).map((line) => (
            <li key={line.name} className="flex justify-between gap-4 px-5 py-3 text-sm">
              <span className="min-w-0">
                <span className="block truncate text-ink-100">{line.name}</span>
                <span className="block text-xs text-ink-400">
                  {line.kind === 'build' ? `${line.parts.length} parts` : 'Component'}
                  {line.quantity > 1 ? ` · x${line.quantity}` : ''}
                </span>
              </span>
              <span className="tnum shrink-0 text-ink-200">{formatMoney(line.totalCents)}</span>
            </li>
          ))}
        </ul>

        {summary?.price ? (
          <dl className="space-y-1.5 border-t border-ink-700 px-5 py-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-300">Parts</dt>
              <dd className="tnum text-ink-100">{formatMoney(summary.price.subtotalCents)}</dd>
            </div>
            {summary.price.serviceLines.map((line) => (
              <div key={line.label} className="flex justify-between gap-4">
                <dt className="truncate text-ink-400">{line.label}</dt>
                <dd className="tnum shrink-0 text-ink-300">{formatMoney(line.amount_cents)}</dd>
              </div>
            ))}
            <div className="flex justify-between">
              <dt className="text-ink-400">Shipping</dt>
              <dd className="tnum text-ink-300">
                {summary.price.shippingIsFree ? 'Free' : formatMoney(summary.price.shippingCents)}
              </dd>
            </div>
            {summary.price.taxLines.map((line) => (
              <div key={line.label} className="flex justify-between">
                <dt className="text-ink-400">{line.label}</dt>
                <dd className="tnum text-ink-300">{formatMoney(line.amount_cents)}</dd>
              </div>
            ))}
            <div className="flex justify-between border-t border-ink-700 pt-3 text-base">
              <dt className="font-medium text-white">Total</dt>
              <dd className="tnum font-semibold text-white">
                {formatMoney(summary.price.totalCents)}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="px-5 py-4 text-sm text-ink-400">Calculating...</p>
        )}
      </Card>
    </div>
  );
}
