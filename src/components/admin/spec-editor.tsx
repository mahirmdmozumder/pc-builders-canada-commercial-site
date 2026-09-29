'use client';

import { useMemo, useState } from 'react';
import { Button, Field, Input, Select } from '@/components/ui';
import type { ComponentCategory } from '@/lib/catalog/types';
import {
  RESERVED_SPEC_KEYS,
  SUGGESTED_SPECS,
  TYPED_FIELDS,
  humanizeSpecKey,
  type TypedField,
} from '@/lib/cms/spec-fields';

export type SpecValue = string | number | boolean;
export type SpecBag = Record<string, SpecValue>;
export type TypedValues = Record<string, unknown>;

/**
 * The two halves of a component's specification.
 *
 * The typed fields come first and are labelled as the ones the compatibility
 * engine reads. That ordering is the whole point: if a socket or a card length
 * ends up in the free-form section instead of its column, the engine does not
 * see it and the check silently reports "unknown" rather than failing. Putting
 * the columns first, with a note on each saying what a rule does with the
 * value, is what stops that happening by accident.
 */

// ---------------------------------------------------------------------------
// Typed compatibility fields
// ---------------------------------------------------------------------------

function TypedInput({
  field,
  value,
  onChange,
}: {
  field: TypedField;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const id = `typed-${field.column}`;
  const label = field.unit ? `${field.label} (${field.unit})` : field.label;

  if (field.kind === 'select') {
    return (
      <Field label={label} htmlFor={id} hint={field.hint}>
        <Select
          id={id}
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value || null)}
        >
          <option value="">Not set</option>
          {field.options?.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </Select>
      </Field>
    );
  }

  if (field.kind === 'multiselect') {
    // Comma-separated rather than a checkbox grid: cooler socket lists are
    // long and open-ended, and typing beats hunting through thirty boxes.
    const current = Array.isArray(value) ? (value as string[]) : [];
    return (
      <Field
        label={label}
        htmlFor={id}
        hint={field.hint ? `${field.hint} Separate with commas.` : 'Separate with commas.'}
      >
        <Input
          id={id}
          value={current.join(', ')}
          placeholder={field.options?.join(', ')}
          onChange={(e) => {
            const parts = e.target.value
              .split(',')
              .map((v) => v.trim())
              .filter(Boolean);
            onChange(parts.length ? parts : null);
          }}
        />
      </Field>
    );
  }

  if (field.kind === 'numberlist') {
    const current = Array.isArray(value) ? (value as number[]) : [];
    return (
      <Field label={label} htmlFor={id} hint={`${field.hint ?? ''} Separate with commas.`.trim()}>
        <Input
          id={id}
          value={current.join(', ')}
          placeholder="240, 280, 360"
          onChange={(e) => {
            const parts = e.target.value
              .split(',')
              .map((v) => Number(v.trim()))
              .filter((n) => Number.isFinite(n) && n > 0);
            onChange(parts.length ? parts : null);
          }}
        />
      </Field>
    );
  }

  if (field.kind === 'number') {
    return (
      <Field label={label} htmlFor={id} hint={field.hint}>
        <Input
          id={id}
          type="number"
          min={0}
          value={value === null || value === undefined ? '' : String(value)}
          onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
        />
      </Field>
    );
  }

  return (
    <Field label={label} htmlFor={id} hint={field.hint}>
      <Input
        id={id}
        value={(value as string) ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
      />
    </Field>
  );
}

export function TypedFieldsEditor({
  category,
  values,
  onChange,
}: {
  category: ComponentCategory;
  values: TypedValues;
  onChange: (column: string, value: unknown) => void;
}) {
  const fields = TYPED_FIELDS[category];

  if (!fields?.length) {
    return (
      <p className="rounded-md border border-ink-700 bg-ink-900 px-4 py-3 text-xs leading-relaxed text-ink-400">
        {humanizeSpecKey(category)} items are sold as finished units, so there are no
        compatibility fields for them and the configurator does not list them. Everything about
        this product goes in the specifications below.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs leading-relaxed text-ink-400">
        These are the fields the compatibility engine actually compares. Anything left blank is
        reported to the customer as <span className="text-ink-200">unknown</span> rather than
        guessed, so it is better to leave one empty than to put an approximate figure in it.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map((field) => (
          <TypedInput
            key={field.column}
            field={field}
            value={values[field.column]}
            onChange={(value) => onChange(field.column, value)}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Free-form specifications
// ---------------------------------------------------------------------------

function coerce(raw: string): SpecValue {
  const trimmed = raw.trim();
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  // Only treat it as a number when the whole string is one, so "8 GB" and
  // "PCIe 5.0 x16" stay text.
  if (trimmed !== '' && Number.isFinite(Number(trimmed))) return Number(trimmed);
  return raw;
}

export function SpecsEditor({
  category,
  specs,
  onChange,
}: {
  category: ComponentCategory;
  specs: SpecBag;
  onChange: (specs: SpecBag) => void;
}) {
  const [newKey, setNewKey] = useState('');

  const entries = useMemo(
    () =>
      Object.entries(specs).filter(
        ([key]) => !RESERVED_SPEC_KEYS.includes(key as (typeof RESERVED_SPEC_KEYS)[number]),
      ),
    [specs],
  );

  const suggestions = (SUGGESTED_SPECS[category] ?? []).filter((key) => !(key in specs));

  function set(key: string, value: SpecValue) {
    onChange({ ...specs, [key]: value });
  }

  function remove(key: string) {
    const next = { ...specs };
    delete next[key];
    onChange(next);
  }

  function rename(from: string, to: string) {
    if (!to.trim() || from === to) return;
    const next: SpecBag = {};
    for (const [key, value] of Object.entries(specs)) {
      next[key === from ? to.trim() : key] = value;
    }
    onChange(next);
  }

  return (
    <div className="space-y-4">
      <p className="text-xs leading-relaxed text-ink-400">
        Anything else worth printing on the product page. These are shown to customers but never
        read by a compatibility rule, so a figure that decides whether parts fit belongs above,
        not here.
      </p>

      {entries.length > 0 ? (
        <ul className="space-y-2">
          {entries.map(([key, value]) => (
            <li key={key} className="grid gap-2 sm:grid-cols-[minmax(0,13rem)_minmax(0,1fr)_auto]">
              <Input
                aria-label={`Specification name for ${key}`}
                defaultValue={key}
                onBlur={(e) => rename(key, e.target.value)}
                className="font-mono text-xs"
              />
              <Input
                aria-label={`Value for ${humanizeSpecKey(key)}`}
                value={String(value)}
                onChange={(e) => set(key, coerce(e.target.value))}
              />
              <button
                type="button"
                onClick={() => remove(key)}
                className="px-2 text-xs text-ink-400 hover:text-danger-400"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-ink-500">No specifications yet.</p>
      )}

      <div className="flex flex-wrap items-end gap-2">
        <Field label="Add a specification" htmlFor="spec-new-key">
          <Input
            id="spec-new-key"
            value={newKey}
            placeholder="e.g. boost_clock"
            className="font-mono text-xs"
            onChange={(e) => setNewKey(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return;
              e.preventDefault();
              if (!newKey.trim()) return;
              set(newKey.trim(), '');
              setNewKey('');
            }}
          />
        </Field>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={!newKey.trim()}
          onClick={() => {
            set(newKey.trim(), '');
            setNewKey('');
          }}
        >
          Add
        </Button>
      </div>

      {suggestions.length > 0 ? (
        <div>
          <p className="text-xs text-ink-400">Common for this category:</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {suggestions.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => set(key, '')}
                className="rounded border border-ink-600 bg-ink-900 px-2 py-0.5 font-mono text-xs text-ink-300 hover:border-gold-600/50 hover:text-white"
              >
                + {key}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Provenance
// ---------------------------------------------------------------------------

/**
 * Whether this row's figures have been checked, and which one has not.
 *
 * This is not decoration. The storefront prints `specs.unverified` as a
 * visible caveat on the product card, and a row marked unverified without one
 * tells a customer nothing useful. Keeping both controls together, with the
 * note required when the box is unticked, is what stops the CMS becoming a way
 * to quietly launder an unchecked figure into a confident-looking listing.
 */
export function ProvenanceEditor({
  verified,
  unverifiedNote,
  priceChecked,
  onVerifiedChange,
  onNoteChange,
  onPriceCheckedChange,
}: {
  verified: boolean;
  unverifiedNote: string;
  priceChecked: string;
  onVerifiedChange: (value: boolean) => void;
  onNoteChange: (value: string) => void;
  onPriceCheckedChange: (value: string) => void;
}) {
  return (
    <div className="space-y-4 rounded-md border border-ink-700 bg-ink-900 p-4">
      <label className="flex items-start gap-2 text-sm text-ink-300">
        <input
          type="checkbox"
          checked={verified}
          onChange={(e) => onVerifiedChange(e.target.checked)}
          className="mt-0.5 size-4 rounded border-ink-600 bg-ink-900 accent-gold-500"
        />
        <span>
          I checked these specifications against the manufacturer or retailer listing
          <span className="block text-xs text-ink-400">
            Leave this unticked if any figure is a guess. The product page says so, which is
            better than a customer finding out after buying.
          </span>
        </span>
      </label>

      {!verified ? (
        <Field
          label="Which figure is unconfirmed?"
          htmlFor="spec-unverified"
          required
          hint="Printed on the product page word for word. Name the specific field, not just 'some specs'."
        >
          <Input
            id="spec-unverified"
            value={unverifiedNote}
            required
            minLength={10}
            placeholder="Card length and TDP were not stated in the retailer listing."
            onChange={(e) => onNoteChange(e.target.value)}
          />
        </Field>
      ) : null}

      <Field
        label="Price last checked"
        htmlFor="spec-price-checked"
        hint="Shown on the product page so a customer knows how current the figure is."
      >
        <Input
          id="spec-price-checked"
          type="date"
          value={priceChecked}
          onChange={(e) => onPriceCheckedChange(e.target.value)}
        />
      </Field>
    </div>
  );
}
