'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Alert, Badge, Card, Input, Select, TableWrap } from '@/components/ui';
import { dollarsToCents, formatMoney } from '@/lib/utils';
import {
  CATEGORY_LABELS,
  COMPONENT_CATEGORIES,
  type ComponentCategory,
  type ComponentRecord,
} from '@/lib/catalog/types';
import type { ContentStatus } from '@/lib/cms/types';

type StatusFilter = 'all' | ContentStatus;
type SortKey = 'price-desc' | 'price-asc' | 'name' | 'category' | 'margin';

/**
 * Repricing view.
 *
 * Built as a near-copy of the inventory table on purpose. Both screens do the
 * same kind of work — scan a list, change one number on several rows, move on —
 * so they should look and behave the same. Somebody who has used one already
 * knows this one.
 *
 * ---------------------------------------------------------------------------
 * DOLLARS IN, CENTS OUT
 * ---------------------------------------------------------------------------
 * The input takes dollars because that is what a supplier invoice says. The API
 * and the database take integer cents, because money held as a float
 * accumulates rounding error the moment it is multiplied by a quantity.
 *
 * The conversion is `Math.round(dollars * 100)` and the rounding is load-bearing:
 * 19.99 * 100 is 1998.9999999999998 in IEEE754, so truncating would silently
 * sell the part for $19.98.
 *
 * ---------------------------------------------------------------------------
 * WHY THERE IS NO SECOND PRICE
 * ---------------------------------------------------------------------------
 * This writes `components.price_cents`, the same column the product editor
 * writes. No override, no pricing table, no "effective price" to compute. That
 * is what makes a change here the real price in the configurator, the cart,
 * checkout, the preset totals and the product pages at the same instant, with no
 * code downstream needing to know this screen exists.
 */
export function PricingTable({ components }: { components: ComponentRecord[] }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<ComponentCategory | 'all'>('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [sort, setSort] = useState<SortKey>('category');
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [reason, setReason] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: 'ok' | 'danger'; text: string } | null>(null);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = components.filter((component) => {
      if (category !== 'all' && component.category !== category) return false;
      if (status !== 'all' && component.status !== status) return false;
      if (!q) return true;
      return `${component.brand} ${component.model} ${component.sku}`.toLowerCase().includes(q);
    });

    const marginPct = (c: ComponentRecord) =>
      c.cost_cents && c.cost_cents > 0 ? (c.price_cents - c.cost_cents) / c.cost_cents : -Infinity;

    return [...filtered].sort((a, b) => {
      switch (sort) {
        case 'price-desc':
          return b.price_cents - a.price_cents;
        case 'price-asc':
          return a.price_cents - b.price_cents;
        case 'name':
          return `${a.brand} ${a.model}`.localeCompare(`${b.brand} ${b.model}`);
        case 'margin':
          // Rows with no cost recorded sink to the bottom rather than reading as
          // zero margin, which would be a claim about a number nobody has.
          return marginPct(a) - marginPct(b);
        default:
          return (
            a.category.localeCompare(b.category) ||
            `${a.brand} ${a.model}`.localeCompare(`${b.brand} ${b.model}`)
          );
      }
    });
  }, [components, query, category, status, sort]);

  const pending = Object.entries(drafts).filter(([, value]) => value !== '').length;
  const withCost = components.filter((c) => c.cost_cents && c.cost_cents > 0).length;

  async function save(component: ComponentRecord) {
    const draft = drafts[component.id];
    if (draft === undefined || draft.trim() === '') return;

    const priceCents = dollarsToCents(draft);
    if (priceCents === null) {
      setMessage({ tone: 'danger', text: 'A price has to be a number, and not a negative one.' });
      return;
    }
    if (priceCents > 100_000_00) {
      setMessage({ tone: 'danger', text: 'That is over the $100,000 ceiling on a single part.' });
      return;
    }

    setBusyId(component.id);
    setMessage(null);

    const response = await fetch('/api/admin/pricing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        component_id: component.id,
        price_cents: priceCents,
        reason: reason || undefined,
      }),
    });

    setBusyId(null);

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setMessage({ tone: 'danger', text: data.error ?? 'Could not update that price.' });
      return;
    }

    const data = (await response.json().catch(() => ({}))) as { changed?: boolean };

    setDrafts((current) => {
      const next = { ...current };
      delete next[component.id];
      return next;
    });

    setMessage({
      tone: 'ok',
      text: data.changed === false
        ? `${component.brand} ${component.model} was already at that price.`
        : `${component.brand} ${component.model} is now ${formatMoney(priceCents)}. Live on the site.`,
    });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">Pricing</h1>
        <p className="mt-1 text-sm text-ink-400">
          Change a price here and it is the price everywhere immediately &mdash; the configurator,
          the shop, product pages, the cart and every pre-built total. Every change is recorded with
          the old figure.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs tracking-wide text-ink-400 uppercase">Products</p>
          <p className="tnum mt-1 text-2xl font-semibold text-white">{components.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs tracking-wide text-ink-400 uppercase">Unsaved edits</p>
          <p
            className={`tnum mt-1 text-2xl font-semibold ${pending > 0 ? 'text-warn-400' : 'text-white'}`}
          >
            {pending}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs tracking-wide text-ink-400 uppercase">Cost recorded</p>
          <p className="tnum mt-1 text-2xl font-semibold text-white">
            {withCost} / {components.length}
          </p>
          {withCost < components.length ? (
            <p className="mt-1 text-xs leading-relaxed text-ink-500">
              Margin is blank without a cost. Add it in{' '}
              <Link href="/admin/content/products" className="text-gold-400 hover:text-gold-300">
                Products
              </Link>
              .
            </p>
          ) : null}
        </Card>
      </div>

      {message ? <Alert tone={message.tone}>{message.text}</Alert> : null}

      <Card className="p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or SKU"
            aria-label="Search products"
            className="lg:max-w-xs"
          />
          <Select
            value={category}
            onChange={(e) => setCategory(e.target.value as ComponentCategory | 'all')}
            aria-label="Filter by category"
            className="lg:max-w-[180px]"
          >
            <option value="all">All categories</option>
            {COMPONENT_CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {CATEGORY_LABELS[value]}
              </option>
            ))}
          </Select>
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusFilter)}
            aria-label="Filter by publication status"
            className="lg:max-w-[170px]"
          >
            <option value="all">All statuses</option>
            <option value="published">Published only</option>
            <option value="draft">Drafts only</option>
            <option value="archived">Archived only</option>
          </Select>
          <Select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            aria-label="Sort"
            className="lg:max-w-[180px]"
          >
            <option value="category">By category</option>
            <option value="price-desc">Price, high to low</option>
            <option value="price-asc">Price, low to high</option>
            <option value="name">Name A&ndash;Z</option>
            <option value="margin">Thinnest margin first</option>
          </Select>
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for changes (optional)"
            aria-label="Reason applied to price changes"
            className="lg:max-w-xs"
          />
        </div>
      </Card>

      <Card className="overflow-hidden">
        <TableWrap>
          <table className="w-full text-sm">
            <caption className="sr-only">Product prices</caption>
            <thead>
              <tr className="border-b border-ink-700 text-left text-xs tracking-wide text-ink-400 uppercase">
                <th scope="col" className="px-4 py-3 font-medium">Product</th>
                <th scope="col" className="px-4 py-3 font-medium">SKU</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Cost</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Price</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Margin</th>
                <th scope="col" className="px-4 py-3 font-medium">Status</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">New price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-700">
              {rows.map((component) => {
                const cost = component.cost_cents;
                const hasCost = Boolean(cost && cost > 0);
                const marginCents = hasCost ? component.price_cents - cost! : null;
                const marginPct = hasCost ? Math.round((marginCents! / cost!) * 100) : null;
                const draft = drafts[component.id] ?? '';

                // Previewed before saving, because a mistyped decimal is the
                // whole risk here and seeing "-$40.00" is what catches it.
                const previewCents = dollarsToCents(draft);
                const previewMargin =
                  previewCents !== null && hasCost ? previewCents - cost! : null;

                return (
                  <tr key={component.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-white">
                        {component.brand} {component.model}
                      </p>
                      <p className="text-xs text-ink-500">{CATEGORY_LABELS[component.category]}</p>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-ink-400">{component.sku}</td>
                    <td className="tnum px-4 py-3 text-right text-ink-400">
                      {hasCost ? formatMoney(cost!) : <span className="text-ink-600">&mdash;</span>}
                    </td>
                    <td className="tnum px-4 py-3 text-right font-medium text-ink-100">
                      {formatMoney(component.price_cents)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {marginPct === null ? (
                        <span className="text-ink-600">&mdash;</span>
                      ) : (
                        <span
                          className={`tnum ${marginCents! < 0 ? 'text-danger-400' : marginPct < 10 ? 'text-warn-400' : 'text-ok-400'}`}
                        >
                          {marginPct}%
                          <span className="ml-1 text-xs text-ink-500">
                            {formatMoney(marginCents!)}
                          </span>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {component.status === 'published' ? (
                        <Badge tone="ok">Live</Badge>
                      ) : component.status === 'draft' ? (
                        <Badge tone="neutral">Draft</Badge>
                      ) : (
                        <Badge tone="warn">Archived</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <label className="sr-only" htmlFor={`price-${component.id}`}>
                          New price for {component.brand} {component.model}, in dollars
                        </label>
                        <span className="text-xs text-ink-500">$</span>
                        <input
                          id={`price-${component.id}`}
                          type="number"
                          min={0}
                          step="0.01"
                          inputMode="decimal"
                          value={draft}
                          placeholder={(component.price_cents / 100).toFixed(2)}
                          onChange={(e) =>
                            setDrafts((current) => ({ ...current, [component.id]: e.target.value }))
                          }
                          // Enter saves the row, because repricing a list is a
                          // typing job and reaching for the mouse every time is
                          // what makes it slow.
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              void save(component);
                            }
                          }}
                          className="tnum w-24 rounded-md border border-ink-600 bg-ink-900 px-2 py-1.5 text-right text-sm text-ink-100 focus:border-gold-500 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => void save(component)}
                          disabled={busyId === component.id || draft.trim() === ''}
                          className="rounded-md bg-ink-700 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-ink-600 disabled:opacity-40"
                        >
                          {busyId === component.id ? 'Saving' : 'Set'}
                        </button>
                      </div>
                      {previewMargin !== null ? (
                        <p
                          className={`tnum mt-1 text-right text-xs ${previewMargin < 0 ? 'text-danger-400' : 'text-ink-500'}`}
                        >
                          {previewMargin < 0 ? 'Below cost by ' : 'Margin '}
                          {formatMoney(Math.abs(previewMargin))}
                        </p>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableWrap>

        {rows.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-ink-400">
            Nothing matches those filters.
          </p>
        ) : null}
      </Card>
    </div>
  );
}
