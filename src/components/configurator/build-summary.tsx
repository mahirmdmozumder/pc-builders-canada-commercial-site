'use client';

import { useState } from 'react';
import { Badge, Dot } from '@/components/ui';
import { formatMoney, cn } from '@/lib/utils';
import { CATEGORY_LABELS, displayName, type ResolvedBuild } from '@/lib/catalog/types';
import type { CompatibilityCheck, CompatibilityReport } from '@/lib/compatibility/engine';
import { compatibilityHeadline } from '@/lib/compatibility/engine';
import type { PriceBreakdown } from '@/lib/pricing/pricing';
import { PROVINCE_OPTIONS } from '@/lib/pricing/tax';

const STATUS_TONE = {
  pass: 'ok',
  warning: 'warn',
  fail: 'danger',
  unknown: 'info',
  skipped: 'neutral',
} as const;

const STATUS_LABEL = {
  pass: 'Pass',
  warning: 'Warning',
  fail: 'Problem',
  unknown: 'No data',
  skipped: 'Waiting',
} as const;

export function CompatibilityPanel({ report }: { report: CompatibilityReport }) {
  const tone =
    report.status === 'incompatible'
      ? 'danger'
      : report.status === 'warnings'
        ? 'warn'
        : report.status === 'compatible'
          ? 'ok'
          : 'neutral';

  const headline =
    report.status === 'compatible'
      ? 'Compatible'
      : report.status === 'incompatible'
        ? 'Not compatible'
        : report.status === 'warnings'
          ? 'Compatible, with warnings'
          : 'Incomplete build';

  // Checks that have nothing to say yet are collapsed out of the way.
  const active = report.checks.filter((c) => c.status !== 'skipped');
  const waiting = report.checks.filter((c) => c.status === 'skipped');

  return (
    <section aria-labelledby="compat-heading" className="border-t border-ink-700">
      <div className="flex items-center justify-between gap-3 px-5 py-4">
        <h3 id="compat-heading" className="text-sm font-semibold text-white">
          Compatibility
        </h3>
        <Badge tone={tone}>
          <Dot tone={tone} />
          {headline}
        </Badge>
      </div>

      <p className="px-5 pb-3 text-xs text-ink-400">{compatibilityHeadline(report)}</p>

      <ul className="divide-y divide-ink-700 border-t border-ink-700">
        {active.map((check) => (
          <CheckRow key={check.id} check={check} />
        ))}
        {waiting.length > 0 ? (
          <li className="px-5 py-3 text-xs text-ink-500">
            {waiting.length} further {waiting.length === 1 ? 'check runs' : 'checks run'} once the
            remaining parts are selected.
          </li>
        ) : null}
      </ul>
    </section>
  );
}

function CheckRow({ check }: { check: CompatibilityCheck }) {
  const [open, setOpen] = useState(false);
  const tone = STATUS_TONE[check.status];

  return (
    <li className="px-5 py-3">
      <div className="flex items-start gap-3">
        <span className="mt-1.5">
          <Dot tone={tone} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-ink-100">{check.title}</p>
            <span
              className={cn(
                'shrink-0 text-xs font-medium',
                tone === 'ok' && 'text-ok-400',
                tone === 'warn' && 'text-warn-400',
                tone === 'danger' && 'text-danger-400',
                tone === 'info' && 'text-info-400',
                tone === 'neutral' && 'text-ink-400',
              )}
            >
              {STATUS_LABEL[check.status]}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-ink-300">{check.message}</p>
          {check.detail ? (
            <>
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                className="mt-1 text-xs font-medium text-ink-400 hover:text-ink-200"
              >
                {open ? 'Hide detail' : 'Why'}
              </button>
              {open ? (
                <p className="mt-1.5 rounded border border-ink-700 bg-ink-900 p-3 text-xs leading-relaxed text-ink-300">
                  {check.detail}
                </p>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </li>
  );
}

export function PowerPanel({ report }: { report: CompatibilityReport }) {
  const [open, setOpen] = useState(false);
  const power = report.power;

  if (power.estimatedWatts === 0) return null;

  const tone =
    power.status === 'insufficient'
      ? 'danger'
      : power.status === 'tight'
        ? 'warn'
        : power.status === 'sufficient'
          ? 'ok'
          : 'neutral';

  return (
    <section aria-labelledby="power-heading" className="border-t border-ink-700 px-5 py-4">
      <div className="flex items-center justify-between gap-3">
        <h3 id="power-heading" className="text-sm font-semibold text-white">
          Estimated power
        </h3>
        {power.selectedPsuWatts ? (
          <Badge tone={tone}>
            <Dot tone={tone} />
            {power.status === 'insufficient'
              ? 'Undersized'
              : power.status === 'tight'
                ? 'Tight'
                : 'Sufficient'}
          </Badge>
        ) : null}
      </div>

      <dl className="mt-3 space-y-1.5 text-sm">
        <div className="flex justify-between">
          <dt className="text-ink-300">Estimated draw</dt>
          <dd className="tnum font-medium text-ink-100">{power.estimatedWatts} W</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-ink-300">Recommended supply</dt>
          <dd className="tnum font-medium text-ink-100">{power.recommendedPsuWatts} W</dd>
        </div>
        {power.selectedPsuWatts ? (
          <div className="flex justify-between">
            <dt className="text-ink-300">Selected supply</dt>
            <dd className="tnum font-medium text-ink-100">{power.selectedPsuWatts} W</dd>
          </div>
        ) : null}
      </dl>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="mt-2 text-xs font-medium text-ink-400 hover:text-ink-200"
      >
        {open ? 'Hide breakdown' : 'Show breakdown'}
      </button>

      {open ? (
        <div className="mt-2 rounded border border-ink-700 bg-ink-900 p-3">
          <ul className="space-y-1 text-xs">
            {power.lineItems.map((line) => (
              <li key={line.category + line.name} className="flex justify-between gap-4">
                <span className="truncate text-ink-300">
                  {line.name}
                  {line.quantity > 1 ? ` x${line.quantity}` : ''}
                  {line.estimated ? (
                    <span className="ml-1 text-ink-500" title="Category default, not part data">
                      (default)
                    </span>
                  ) : null}
                </span>
                <span className="tnum shrink-0 text-ink-200">{line.watts} W</span>
              </li>
            ))}
            <li className="flex justify-between gap-4 border-t border-ink-700 pt-1 text-ink-400">
              <span>Fans, chipset and conversion losses</span>
              <span className="tnum">{power.overheadWatts} W</span>
            </li>
          </ul>
          <p className="mt-2 text-xs leading-relaxed text-ink-500">
            Calculated from component power figures with a 1.35x headroom multiplier applied to the
            recommendation. This is an estimate, not a measurement.
          </p>
        </div>
      ) : null}
    </section>
  );
}

export function PricePanel({
  price,
  province,
  onProvinceChange,
}: {
  price: PriceBreakdown;
  province: string;
  onProvinceChange: (province: string) => void;
}) {
  return (
    <section aria-labelledby="price-heading" className="border-t border-ink-700 px-5 py-4">
      <h3 id="price-heading" className="text-sm font-semibold text-white">
        Estimate
      </h3>

      <dl className="mt-3 space-y-1.5 text-sm">
        <Row label="Parts" value={formatMoney(price.subtotalCents)} />
        {price.serviceLines.map((line) => (
          <Row key={line.label} label={line.label} value={formatMoney(line.amount_cents)} muted />
        ))}
        <Row
          label="Shipping"
          value={price.shippingIsFree ? 'Free' : formatMoney(price.shippingCents)}
          muted
        />
        {price.taxLines.map((line) => (
          <Row
            key={line.label}
            label={`${line.label} (${(line.rate * 100).toFixed(line.rate === 0.09975 ? 3 : 0)}%)`}
            value={formatMoney(line.amount_cents)}
            muted
          />
        ))}
      </dl>

      <div className="mt-3 flex items-end justify-between border-t border-ink-700 pt-3">
        <div>
          <p className="text-sm font-medium text-white">Estimated total</p>
          <p className="text-xs text-ink-400">Final price confirmed at checkout</p>
        </div>
        <p className="tnum text-2xl font-semibold text-white">{formatMoney(price.totalCents)}</p>
      </div>

      <div className="mt-4">
        <label htmlFor="province" className="block text-xs text-ink-400">
          Ship to
        </label>
        <select
          id="province"
          value={province}
          onChange={(e) => onProvinceChange(e.target.value)}
          className="mt-1 w-full rounded-md border border-ink-600 bg-ink-900 px-3 py-2 text-sm text-ink-100 focus:border-maple-500 focus:outline-none"
        >
          {PROVINCE_OPTIONS.map((p) => (
            <option key={p.code} value={p.code}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
    </section>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className={cn('truncate', muted ? 'text-ink-400' : 'text-ink-300')}>{label}</dt>
      <dd className={cn('tnum shrink-0', muted ? 'text-ink-300' : 'font-medium text-ink-100')}>
        {value}
      </dd>
    </div>
  );
}

export function SelectedParts({
  build,
  onRemove,
}: {
  build: ResolvedBuild;
  onRemove: (componentId: string) => void;
}) {
  if (build.length === 0) {
    return (
      <p className="px-5 py-8 text-center text-sm text-ink-400">
        Nothing selected yet. Start with a processor.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-ink-700">
      {build.map((item) => (
        <li key={item.component.id} className="flex items-start gap-3 px-5 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-ink-400">{CATEGORY_LABELS[item.category]}</p>
            <p className="truncate text-sm text-ink-100">
              {displayName(item.component)}
              {item.quantity > 1 ? (
                <span className="ml-1 text-ink-400">x{item.quantity}</span>
              ) : null}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="tnum text-sm text-ink-200">
              {formatMoney(item.component.price_cents * item.quantity)}
            </span>
            <button
              type="button"
              onClick={() => onRemove(item.component.id)}
              className="rounded p-1 text-ink-500 hover:text-danger-400"
              aria-label={`Remove ${displayName(item.component)}`}
            >
              <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
