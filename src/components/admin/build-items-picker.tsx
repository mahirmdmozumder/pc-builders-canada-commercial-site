'use client';

import { useMemo, useState } from 'react';
import { Button, Field, Input, Select } from '@/components/ui';
import { formatMoney } from '@/lib/utils';
import {
  CATEGORY_LABELS,
  CONFIGURATOR_CATEGORIES,
  displayName,
  type ComponentCategory,
  type PublicComponent,
} from '@/lib/catalog/types';
import type { SavedBuildItem } from '@/types/domain';

/**
 * Picks catalogue parts for a build preset or a portfolio write-up.
 *
 * Parts are SELECTED, never typed. Two reasons, and both of them are the
 * difference between a build that works and one that looks like it does:
 *
 *   - A typed part name is not a catalogue row, so the preset could not be
 *     priced, could not be loaded into the configurator, and could not be
 *     compatibility checked.
 *   - A typed name drifts. The catalogue row moves price, the write-up does
 *     not, and the site ends up quoting a figure nobody sells at.
 *
 * The running total shown here is computed from the same catalogue rows the
 * storefront prices from, so what an admin sees while building a preset is
 * what a customer will see.
 */
export function BuildItemsPicker({
  catalogue,
  items,
  onChange,
  label = 'Parts',
}: {
  catalogue: PublicComponent[];
  items: SavedBuildItem[];
  onChange: (items: SavedBuildItem[]) => void;
  label?: string;
}) {
  const [category, setCategory] = useState<ComponentCategory>('cpu');
  const [search, setSearch] = useState('');

  const byId = useMemo(() => new Map(catalogue.map((c) => [c.id, c])), [catalogue]);

  const options = useMemo(() => {
    const q = search.trim().toLowerCase();
    return catalogue
      .filter((c) => c.category === category)
      .filter((c) => (q ? `${c.brand} ${c.model} ${c.sku}`.toLowerCase().includes(q) : true))
      .sort((a, b) => a.price_cents - b.price_cents);
  }, [catalogue, category, search]);

  const total = items.reduce((sum, item) => {
    const component = byId.get(item.component_id);
    return sum + (component ? component.price_cents * item.quantity : 0);
  }, 0);

  const missing = items.filter((item) => !byId.get(item.component_id));

  function add(componentId: string) {
    const component = byId.get(componentId);
    if (!component) return;
    if (items.some((i) => i.component_id === componentId)) return;
    onChange([...items, { category: component.category, component_id: componentId, quantity: 1 }]);
  }

  function setQuantity(componentId: string, quantity: number) {
    onChange(
      items.map((i) => (i.component_id === componentId ? { ...i, quantity: Math.max(1, quantity) } : i)),
    );
  }

  return (
    <div className="space-y-3">
      <span className="block text-sm font-medium text-ink-100">{label}</span>

      {items.length > 0 ? (
        <ul className="divide-y divide-ink-700 rounded-md border border-ink-700">
          {items.map((item) => {
            const component = byId.get(item.component_id);
            return (
              <li key={item.component_id} className="flex items-center gap-3 px-3 py-2 text-sm">
                <span className="w-28 shrink-0 text-xs text-ink-400">
                  {CATEGORY_LABELS[item.category] ?? item.category}
                </span>
                <span className="min-w-0 flex-1">
                  {component ? (
                    <span className="truncate text-ink-100">{displayName(component)}</span>
                  ) : (
                    <span className="text-danger-400">
                      {item.component_id} — not in the catalogue
                    </span>
                  )}
                </span>
                <input
                  type="number"
                  min={1}
                  value={item.quantity}
                  aria-label={`Quantity of ${component ? displayName(component) : item.component_id}`}
                  onChange={(e) => setQuantity(item.component_id, Number(e.target.value))}
                  className="tnum w-16 rounded border border-ink-600 bg-ink-900 px-2 py-1 text-right text-xs text-ink-100"
                />
                <span className="tnum w-24 shrink-0 text-right text-xs text-ink-300">
                  {component ? formatMoney(component.price_cents * item.quantity) : '—'}
                </span>
                <button
                  type="button"
                  onClick={() => onChange(items.filter((i) => i.component_id !== item.component_id))}
                  className="shrink-0 text-xs text-ink-400 hover:text-danger-400"
                >
                  Remove
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="rounded-md border border-dashed border-ink-600 px-3 py-6 text-center text-sm text-ink-400">
          No parts selected yet.
        </p>
      )}

      {missing.length > 0 ? (
        <p className="rounded-md border border-danger-500/40 bg-danger-500/10 px-3 py-2 text-xs text-danger-400">
          {missing.length} part{missing.length === 1 ? '' : 's'} above no longer exist in the
          catalogue. They will not be priced and will not load into the configurator — remove them
          or add the parts back.
        </p>
      ) : null}

      <div className="flex items-center justify-between rounded-md border border-ink-700 bg-ink-900 px-3 py-2">
        <span className="text-xs text-ink-400">
          Parts total, priced live from the catalogue
        </span>
        <span className="tnum font-medium text-white">{formatMoney(total)}</span>
      </div>

      <div className="grid gap-2 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)]">
        <Field label="Add from category" htmlFor="bp-category">
          <Select
            id="bp-category"
            value={category}
            onChange={(e) => setCategory(e.target.value as ComponentCategory)}
          >
            {CONFIGURATOR_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Search that category" htmlFor="bp-search">
          <Input
            id="bp-search"
            value={search}
            placeholder="Brand or model"
            onChange={(e) => setSearch(e.target.value)}
          />
        </Field>
      </div>

      <div className="thin-scroll max-h-56 overflow-y-auto rounded-md border border-ink-700">
        {options.length === 0 ? (
          <p className="px-3 py-4 text-sm text-ink-400">Nothing in that category matches.</p>
        ) : (
          <ul className="divide-y divide-ink-700">
            {options.map((component) => {
              const already = items.some((i) => i.component_id === component.id);
              return (
                <li key={component.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                  <span className="min-w-0 flex-1 truncate text-ink-200">
                    {displayName(component)}
                  </span>
                  <span className="tnum shrink-0 text-xs text-ink-400">
                    {formatMoney(component.price_cents)}
                  </span>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={already}
                    onClick={() => add(component.id)}
                  >
                    {already ? 'Added' : 'Add'}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
