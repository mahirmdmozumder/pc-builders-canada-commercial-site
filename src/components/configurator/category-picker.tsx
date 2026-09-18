'use client';

import { useMemo, useState } from 'react';
import { Badge, Input } from '@/components/ui';
import { ComponentThumb } from '@/components/configurator/component-thumb';
import { specChips, specRows } from '@/components/configurator/spec-chips';
import { cn, formatMoney } from '@/lib/utils';
import {
  CATEGORY_LABELS,
  displayName,
  isLowStock,
  type ComponentCategory,
  type PublicComponent,
} from '@/lib/catalog/types';

export interface CandidateIssue {
  /** 'fail' blocks the build; 'warning' is worth knowing before selecting. */
  severity: 'fail' | 'warning';
  message: string;
}

export function CategoryPicker({
  category,
  options,
  selectedIds,
  issues,
  onSelect,
  onClose,
}: {
  category: ComponentCategory;
  options: PublicComponent[];
  selectedIds: string[];
  /** Compatibility outcome for each candidate against the rest of the build. */
  issues: Map<string, CandidateIssue>;
  onSelect: (component: PublicComponent) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'price-asc' | 'price-desc'>('price-asc');
  const [hideIncompatible, setHideIncompatible] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = options.filter((o) =>
      q ? `${o.brand} ${o.model} ${o.description}`.toLowerCase().includes(q) : true,
    );
    if (hideIncompatible) {
      rows = rows.filter((o) => issues.get(o.id)?.severity !== 'fail' || selectedIds.includes(o.id));
    }
    return rows.sort((a, b) =>
      sort === 'price-asc' ? a.price_cents - b.price_cents : b.price_cents - a.price_cents,
    );
  }, [options, query, sort, hideIncompatible, issues, selectedIds]);

  const hiddenCount = options.length - filtered.length;

  return (
    <div className="border-t border-ink-700 bg-ink-900">
      <div className="flex flex-col gap-3 border-b border-ink-700 p-4 sm:flex-row sm:items-center">
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${CATEGORY_LABELS[category].toLowerCase()}`}
          aria-label={`Search ${CATEGORY_LABELS[category]}`}
          className="sm:max-w-xs"
        />
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-ink-300">
            <span className="sr-only sm:not-sr-only">Sort</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
              className="rounded-md border border-ink-600 bg-ink-900 px-2 py-1.5 text-xs text-ink-100 focus:border-maple-500 focus:outline-none"
            >
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-xs text-ink-300">
            <input
              type="checkbox"
              checked={hideIncompatible}
              onChange={(e) => setHideIncompatible(e.target.checked)}
              className="size-4 rounded border-ink-600 bg-ink-900 accent-maple-500"
            />
            Hide parts that do not fit
          </label>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto rounded-md px-2 py-1 text-xs text-ink-400 hover:text-ink-100"
          >
            Close
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-ink-400">
          No {CATEGORY_LABELS[category].toLowerCase()} matches those filters.
        </p>
      ) : (
        <ul className="divide-y divide-ink-700">
          {filtered.map((option) => {
            const issue = issues.get(option.id);
            const selected = selectedIds.includes(option.id);
            const isExpanded = expanded === option.id;
            return (
              <li key={option.id} className={cn(selected && 'bg-ink-850')}>
                <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start">
                  <div className="size-14 shrink-0">
                    <ComponentThumb
                      category={option.category}
                      imageUrl={option.image_url}
                      alt={displayName(option)}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-white">{displayName(option)}</p>
                      {option.data_confidence === 'sample' ? (
                        <span
                          className="rounded border border-ink-600 px-1.5 py-0.5 text-[0.65rem] text-ink-400"
                          title="Specifications in this row have not been verified against manufacturer documentation"
                        >
                          unverified spec
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-1 line-clamp-2 text-sm text-ink-300">{option.description}</p>

                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {specChips(option).map((chip) => (
                        <span
                          key={chip}
                          className="tnum rounded border border-ink-700 bg-ink-850 px-1.5 py-0.5 font-mono text-[0.7rem] text-ink-300"
                        >
                          {chip}
                        </span>
                      ))}
                    </div>

                    {issue ? (
                      <p
                        className={cn(
                          'mt-2 text-xs',
                          issue.severity === 'fail' ? 'text-danger-400' : 'text-warn-400',
                        )}
                      >
                        {issue.message}
                      </p>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => setExpanded(isExpanded ? null : option.id)}
                      aria-expanded={isExpanded}
                      className="mt-2 text-xs font-medium text-ink-400 hover:text-ink-100"
                    >
                      {isExpanded ? 'Hide specifications' : 'Specifications'}
                    </button>
                  </div>

                  <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-end">
                    <div className="sm:text-right">
                      <p className="tnum font-semibold text-white">
                        {formatMoney(option.price_cents)}
                      </p>
                      <StockLabel component={option} />
                    </div>
                    <button
                      type="button"
                      onClick={() => onSelect(option)}
                      disabled={option.stock_quantity <= 0}
                      className={cn(
                        'rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-40',
                        selected
                          ? 'border border-ok-600/40 bg-ok-600/15 text-ok-400'
                          : 'bg-maple-600 text-white hover:bg-maple-500',
                      )}
                    >
                      {selected ? 'Selected' : 'Select'}
                    </button>
                  </div>
                </div>

                {isExpanded ? (
                  <div className="border-t border-ink-700 bg-ink-850 px-4 py-4">
                    <dl className="grid gap-x-8 gap-y-1.5 text-xs sm:grid-cols-2">
                      {specRows(option).map((row) => (
                        <div key={row.term} className="flex justify-between gap-4 border-b border-ink-700/60 py-1">
                          <dt className="text-ink-400">{row.term}</dt>
                          <dd className="tnum text-right text-ink-200">{row.value}</dd>
                        </div>
                      ))}
                    </dl>
                    {option.data_confidence === 'sample' ? (
                      <p className="mt-3 text-xs text-ink-500">
                        These figures are development sample data and have not been checked against
                        the manufacturer spec sheet.
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {hiddenCount > 0 && hideIncompatible ? (
        <p className="border-t border-ink-700 px-4 py-3 text-xs text-ink-500">
          {hiddenCount} {hiddenCount === 1 ? 'part is' : 'parts are'} hidden because they do not fit
          the current selection.
        </p>
      ) : null}
    </div>
  );
}

function StockLabel({ component }: { component: PublicComponent }) {
  if (component.stock_quantity <= 0) {
    return <p className="mt-0.5 text-xs text-danger-400">Out of stock</p>;
  }
  if (isLowStock(component)) {
    return <p className="mt-0.5 text-xs text-warn-400">Only {component.stock_quantity} left</p>;
  }
  return <p className="mt-0.5 text-xs text-ink-500">In stock</p>;
}

export function SelectedRow({
  category,
  component,
  quantity,
  onOpen,
  onRemove,
  onQuantity,
  allowQuantity,
}: {
  category: ComponentCategory;
  component: PublicComponent | null;
  quantity: number;
  onOpen: () => void;
  onRemove: () => void;
  onQuantity: (qty: number) => void;
  allowQuantity: boolean;
}) {
  if (!component) {
    return (
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-center gap-4 px-4 py-4 text-left transition-colors hover:bg-ink-850"
      >
        <div className="size-12 shrink-0">
          <ComponentThumb category={category} alt={CATEGORY_LABELS[category]} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-white">{CATEGORY_LABELS[category]}</p>
          <p className="text-sm text-ink-400">Not selected</p>
        </div>
        <span className="text-sm font-medium text-maple-400">Choose</span>
      </button>
    );
  }

  return (
    <div className="flex items-start gap-4 px-4 py-4">
      <div className="size-12 shrink-0">
        <ComponentThumb
          category={category}
          imageUrl={component.image_url}
          alt={displayName(component)}
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-ink-400">{CATEGORY_LABELS[category]}</p>
        <p className="truncate text-sm font-medium text-white">{displayName(component)}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          {specChips(component).slice(0, 3).map((chip) => (
            <span key={chip} className="font-mono text-[0.7rem] text-ink-400">
              {chip}
            </span>
          ))}
          {isLowStock(component) ? <Badge tone="warn">Low stock</Badge> : null}
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <span className="tnum text-sm font-semibold text-white">
          {formatMoney(component.price_cents * quantity)}
        </span>
        <div className="flex items-center gap-2">
          {allowQuantity ? (
            <label className="flex items-center gap-1 text-xs text-ink-400">
              <span className="sr-only">Quantity of {displayName(component)}</span>
              <select
                value={quantity}
                onChange={(e) => onQuantity(Number(e.target.value))}
                className="rounded border border-ink-600 bg-ink-900 px-1.5 py-1 text-xs text-ink-100 focus:border-maple-500 focus:outline-none"
              >
                {[1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>
                    x{n}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <button
            type="button"
            onClick={onOpen}
            className="rounded px-2 py-1 text-xs font-medium text-maple-400 hover:text-maple-300"
          >
            Change
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="rounded px-1.5 py-1 text-xs text-ink-500 hover:text-danger-400"
            aria-label={`Remove ${displayName(component)}`}
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}
