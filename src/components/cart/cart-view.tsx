'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Alert, Button, ButtonLink, Card, EmptyState, Select } from '@/components/ui';
import { useCart, type CartLine } from '@/lib/cart/store';
import { formatMoney } from '@/lib/utils';
import { useHydrated } from '@/lib/hooks/use-hydrated';
import { PROVINCE_OPTIONS } from '@/lib/pricing/tax';
import type { ResolvedCart } from '@/lib/cart/summary';

/** Shape sent to the pricing endpoint. Mirrors checkoutLineSchema. */
function toApiLines(lines: CartLine[]) {
  return lines.map((line) =>
    line.kind === 'build'
      ? { kind: 'build' as const, name: line.name, items: line.items, quantity: line.quantity }
      : { kind: 'component' as const, component_id: line.componentId, quantity: line.quantity },
  );
}

/**
 * The cart lives in localStorage, so the view is mounted only after
 * hydration. Pricing is then fetched from the server rather than computed
 * here, so the figures shown match what checkout will charge.
 */
export function CartView() {
  const hydrated = useHydrated();
  if (!hydrated) {
    return <p className="py-12 text-center text-sm text-ink-400">Loading your cart...</p>;
  }
  return <CartViewInner />;
}

function CartViewInner() {
  const lines = useCart((s) => s.lines);
  const province = useCart((s) => s.province);
  const setProvince = useCart((s) => s.setProvince);
  const setQuantity = useCart((s) => s.setQuantity);
  const remove = useCart((s) => s.remove);

  const [summary, setSummary] = useState<ResolvedCart | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Could not price your cart.');
        setSummary(data as ResolvedCart);
        setError(null);
      })
      .catch((err: Error) => {
        if (err.name === 'AbortError') return;
        setError(err.message);
      });

    return () => controller.abort();
  }, [payload, province, lines.length]);

  // Derived rather than stored: one less piece of state to keep in sync.
  const loading = summary === null && error === null && lines.length > 0;

  if (lines.length === 0) {
    return (
      <EmptyState
        title="Your cart is empty"
        description="Configure a build or add individual parts, and they will show up here."
        action={<ButtonLink href="/build">Build your PC</ButtonLink>}
      />
    );
  }

  const blocking = (summary?.problems.length ?? 0) > 0;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
      <div className="space-y-4">
        {error ? <Alert tone="danger" title="Could not price your cart">{error}</Alert> : null}

        {summary?.problems.length ? (
          <Alert tone="warn" title="This cart needs attention before checkout">
            <ul className="mt-1 list-disc space-y-1 pl-5">
              {summary.problems.map((problem) => (
                <li key={problem}>{problem}</li>
              ))}
            </ul>
          </Alert>
        ) : null}

        {lines.map((line, index) => {
          const resolved = summary?.lines[index];
          return (
            <Card key={line.id} className="overflow-hidden">
              <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start">
                <div className="min-w-0 flex-1">
                  <p className="text-xs tracking-wide text-ink-400 uppercase">
                    {line.kind === 'build' ? 'Custom build' : 'Component'}
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-white">{line.name}</h2>

                  {line.kind === 'build' && resolved?.parts.length ? (
                    <details className="mt-3">
                      <summary className="cursor-pointer text-sm text-maple-400">
                        {resolved.parts.length} parts
                      </summary>
                      <ul className="mt-2 space-y-1 text-sm text-ink-300">
                        {resolved.parts.map((part) => (
                          <li key={part.category + part.name} className="flex justify-between gap-4">
                            <span className="truncate">
                              {part.name}
                              {part.quantity > 1 ? ` x${part.quantity}` : ''}
                            </span>
                            <span className="tnum shrink-0">{formatMoney(part.priceCents)}</span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  ) : null}

                  {line.kind === 'build' ? (
                    <p className="mt-3 text-xs text-ink-400">
                      Assembly, cable management and testing are added once per system at checkout.
                    </p>
                  ) : null}

                  {resolved?.problems.length ? (
                    <ul className="mt-3 space-y-1 text-xs text-warn-400">
                      {resolved.problems.map((problem) => (
                        <li key={problem}>{problem}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>

                <div className="flex shrink-0 items-center justify-between gap-4 sm:flex-col sm:items-end">
                  <p className="tnum text-lg font-semibold text-white">
                    {formatMoney(resolved?.totalCents ?? line.snapshotPriceCents * line.quantity)}
                  </p>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 text-xs text-ink-400">
                      <span className="sr-only">Quantity of {line.name}</span>
                      <select
                        value={line.quantity}
                        onChange={(e) => setQuantity(line.id, Number(e.target.value))}
                        className="rounded border border-ink-600 bg-ink-900 px-2 py-1 text-sm text-ink-100 focus:border-maple-500 focus:outline-none"
                      >
                        {Array.from({ length: line.kind === 'build' ? 3 : 10 }, (_, i) => i + 1).map(
                          (n) => (
                            <option key={n} value={n}>
                              {n}
                            </option>
                          ),
                        )}
                      </select>
                    </label>
                    <button
                      type="button"
                      onClick={() => remove(line.id)}
                      className="text-xs text-ink-400 hover:text-danger-400"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}

        <Link href="/build" className="inline-block text-sm text-maple-400 hover:text-maple-300">
          &larr; Keep configuring
        </Link>
      </div>

      <Card className="overflow-hidden lg:sticky lg:top-20">
        <div className="border-b border-ink-700 px-5 py-4">
          <h2 className="text-sm font-semibold tracking-wide text-white uppercase">Order summary</h2>
        </div>

        <div className="px-5 py-4">
          <label htmlFor="cart-province" className="block text-xs text-ink-400">
            Ship to
          </label>
          <Select
            id="cart-province"
            value={province}
            onChange={(e) => setProvince(e.target.value)}
            className="mt-1"
          >
            {PROVINCE_OPTIONS.map((p) => (
              <option key={p.code} value={p.code}>
                {p.name}
              </option>
            ))}
          </Select>
        </div>

        {summary?.price ? (
          <dl className="space-y-1.5 border-t border-ink-700 px-5 py-4 text-sm">
            <Row label="Parts" value={formatMoney(summary.price.subtotalCents)} />
            {summary.price.serviceLines.map((line) => (
              <Row key={line.label} label={line.label} value={formatMoney(line.amount_cents)} muted />
            ))}
            <Row
              label="Shipping"
              value={summary.price.shippingIsFree ? 'Free' : formatMoney(summary.price.shippingCents)}
              muted
            />
            {summary.price.taxLines.map((line) => (
              <Row
                key={line.label}
                label={line.label}
                value={formatMoney(line.amount_cents)}
                muted
              />
            ))}
            <div className="flex justify-between border-t border-ink-700 pt-3 text-base">
              <dt className="font-medium text-white">Total</dt>
              <dd className="tnum font-semibold text-white">
                {formatMoney(summary.price.totalCents)}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="px-5 py-4 text-sm text-ink-400">
            {loading ? 'Calculating...' : 'Add something to see a total.'}
          </p>
        )}

        <div className="border-t border-ink-700 px-5 py-4">
          <ButtonLink
            href="/checkout"
            size="lg"
            className="w-full"
            aria-disabled={blocking}
            onClick={(event) => {
              if (blocking) event.preventDefault();
            }}
          >
            Continue to checkout
          </ButtonLink>
          {blocking ? (
            <p className="mt-2 text-xs text-warn-400">
              Resolve the issues above before checking out.
            </p>
          ) : null}
          <p className="mt-3 text-xs leading-relaxed text-ink-500">
            Payment is processed by Stripe. We never see or store your card details.
          </p>
        </div>
      </Card>
    </div>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className={muted ? 'text-ink-400' : 'text-ink-300'}>{label}</dt>
      <dd className={muted ? 'tnum text-ink-300' : 'tnum font-medium text-ink-100'}>{value}</dd>
    </div>
  );
}

export function CartActionsFallback() {
  return <Button disabled>Loading</Button>;
}
