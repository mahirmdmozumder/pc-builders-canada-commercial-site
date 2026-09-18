'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Badge, Card, Input, Select, TableWrap } from '@/components/ui';
import { formatMoney } from '@/lib/utils';
import {
  CATEGORY_LABELS,
  COMPONENT_CATEGORIES,
  type ComponentCategory,
  type ComponentRecord,
} from '@/lib/catalog/types';

type StockFilter = 'all' | 'low' | 'out';

/**
 * Inventory counting view.
 *
 * Each row edits one number. Adjustments post individually and are logged
 * with the delta and a reason, so a discrepancy found later can be traced to
 * the adjustment that caused it.
 */
export function InventoryTable({ components }: { components: ComponentRecord[] }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<ComponentCategory | 'all'>('all');
  const [filter, setFilter] = useState<StockFilter>('all');
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [reason, setReason] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: 'ok' | 'danger'; text: string } | null>(null);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return components
      .filter((component) => {
        if (!component.active) return false;
        if (category !== 'all' && component.category !== category) return false;
        if (filter === 'low' && component.stock_quantity > component.low_stock_threshold) return false;
        if (filter === 'out' && component.stock_quantity > 0) return false;
        if (!q) return true;
        return `${component.brand} ${component.model} ${component.sku}`.toLowerCase().includes(q);
      })
      .sort((a, b) => a.stock_quantity - b.stock_quantity);
  }, [components, query, category, filter]);

  const stockValueCents = components.reduce(
    (sum, c) => sum + (c.cost_cents ?? 0) * c.stock_quantity,
    0,
  );
  const lowCount = components.filter(
    (c) => c.active && c.stock_quantity <= c.low_stock_threshold,
  ).length;

  async function adjust(component: ComponentRecord) {
    const draft = drafts[component.id];
    if (draft === undefined || draft === '') return;
    const next = Number(draft);
    if (!Number.isInteger(next) || next < 0) {
      setMessage({ tone: 'danger', text: 'Stock must be a whole number of units.' });
      return;
    }

    setBusyId(component.id);
    setMessage(null);

    const response = await fetch('/api/admin/inventory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        component_id: component.id,
        stock_quantity: next,
        reason: reason || undefined,
      }),
    });

    setBusyId(null);

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setMessage({ tone: 'danger', text: data.error ?? 'Could not adjust that stock level.' });
      return;
    }

    setDrafts((current) => {
      const next = { ...current };
      delete next[component.id];
      return next;
    });
    setMessage({
      tone: 'ok',
      text: `${component.brand} ${component.model} updated.`,
    });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">Inventory</h1>
        <p className="mt-1 text-sm text-ink-400">
          Active parts only. Stock is decremented automatically when an order is paid.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs tracking-wide text-ink-400 uppercase">Active parts</p>
          <p className="tnum mt-1 text-2xl font-semibold text-white">
            {components.filter((c) => c.active).length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs tracking-wide text-ink-400 uppercase">Low stock</p>
          <p
            className={`tnum mt-1 text-2xl font-semibold ${lowCount > 0 ? 'text-warn-400' : 'text-white'}`}
          >
            {lowCount}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs tracking-wide text-ink-400 uppercase">Stock at cost</p>
          <p className="tnum mt-1 text-2xl font-semibold text-white">
            {formatMoney(stockValueCents, { whole: true })}
          </p>
        </Card>
      </div>

      {message ? <Alert tone={message.tone}>{message.text}</Alert> : null}

      <Card className="p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search parts"
            aria-label="Search inventory"
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
            value={filter}
            onChange={(e) => setFilter(e.target.value as StockFilter)}
            aria-label="Filter by stock level"
            className="lg:max-w-[180px]"
          >
            <option value="all">All stock levels</option>
            <option value="low">Low stock only</option>
            <option value="out">Out of stock only</option>
          </Select>
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for adjustments (optional)"
            aria-label="Reason applied to adjustments"
            className="lg:max-w-xs"
          />
        </div>
      </Card>

      <Card className="overflow-hidden">
        <TableWrap>
          <table className="w-full text-sm">
            <caption className="sr-only">Inventory levels</caption>
            <thead>
              <tr className="border-b border-ink-700 text-left text-xs tracking-wide text-ink-400 uppercase">
                <th scope="col" className="px-4 py-3 font-medium">Part</th>
                <th scope="col" className="px-4 py-3 font-medium">SKU</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">In stock</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Threshold</th>
                <th scope="col" className="px-4 py-3 font-medium">Status</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Adjust to</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-700">
              {rows.map((component) => {
                const out = component.stock_quantity === 0;
                const low = !out && component.stock_quantity <= component.low_stock_threshold;
                return (
                  <tr key={component.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-white">
                        {component.brand} {component.model}
                      </p>
                      <p className="text-xs text-ink-500">{CATEGORY_LABELS[component.category]}</p>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-ink-400">{component.sku}</td>
                    <td className="tnum px-4 py-3 text-right text-ink-100">
                      {component.stock_quantity}
                    </td>
                    <td className="tnum px-4 py-3 text-right text-ink-400">
                      {component.low_stock_threshold}
                    </td>
                    <td className="px-4 py-3">
                      {out ? (
                        <Badge tone="danger">Out of stock</Badge>
                      ) : low ? (
                        <Badge tone="warn">Low</Badge>
                      ) : (
                        <Badge tone="ok">OK</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <label className="sr-only" htmlFor={`stock-${component.id}`}>
                          New stock level for {component.brand} {component.model}
                        </label>
                        <input
                          id={`stock-${component.id}`}
                          type="number"
                          min={0}
                          value={drafts[component.id] ?? ''}
                          placeholder={String(component.stock_quantity)}
                          onChange={(e) =>
                            setDrafts((current) => ({ ...current, [component.id]: e.target.value }))
                          }
                          className="tnum w-20 rounded-md border border-ink-600 bg-ink-900 px-2 py-1.5 text-right text-sm text-ink-100 focus:border-maple-500 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => adjust(component)}
                          disabled={busyId === component.id || !drafts[component.id]}
                          className="rounded-md bg-ink-700 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-ink-600 disabled:opacity-40"
                        >
                          {busyId === component.id ? 'Saving' : 'Set'}
                        </button>
                      </div>
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
