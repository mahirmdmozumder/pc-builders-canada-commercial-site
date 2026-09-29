'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Badge, Button, Card, Field, Input, Select, TableWrap, Textarea } from '@/components/ui';
import { formatMoney } from '@/lib/utils';
import {
  CATEGORY_LABELS,
  COMPONENT_CONDITIONS,
  CONDITION_LABELS,
  type ComponentCondition,
  type ComponentRecord,
} from '@/lib/catalog/types';
import type { ContentStatus } from '@/lib/cms/types';
import { NoticeBar, StatusBadge, type Notice } from '@/components/admin/content-controls';

/**
 * Refurbished and open-box stock.
 *
 * Deliberately the simplest screen in the admin. A refurbished unit is one
 * physical object that arrived, got tested, and needs listing quickly — so
 * everything that matters is editable inline: what condition it is in, what
 * was done to it, what it costs, and whether it is live.
 *
 * The condition note is mandatory and cannot be worked around here. It is
 * enforced by a database check constraint, by the API schema and by this form,
 * because a buyer paying less is entitled to know why, and a listing that
 * cannot say why should not be published.
 *
 * Marking an existing product refurbished is the wrong move: that row is the
 * NEW product, referenced by past orders. The "Duplicate" action on the
 * Products screen makes a copy to mark up instead, which is why this screen
 * points there rather than offering its own create button.
 */
export function RefurbishedManager({ components }: { components: ComponentRecord[] }) {
  const router = useRouter();
  const [notice, setNotice] = useState<Notice>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const listings = useMemo(() => {
    const q = search.trim().toLowerCase();
    return components
      .filter((c) => c.condition !== 'new')
      .filter((c) => (q ? `${c.brand} ${c.model} ${c.sku}`.toLowerCase().includes(q) : true))
      .sort((a, b) => (b.updated_at ?? '').localeCompare(a.updated_at ?? ''));
  }, [components, search]);

  async function save(id: string, values: Record<string, unknown>, label: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/components/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const fieldError = data.fields ? Object.values(data.fields)[0] : null;
        throw new Error(String(fieldError ?? data.error ?? 'That did not save.'));
      }
      setNotice({ tone: 'ok', text: `Saved ${label}.` });
      setEditing(null);
      router.refresh();
    } catch (err) {
      setNotice({ tone: 'danger', text: err instanceof Error ? err.message : 'Something failed.' });
    } finally {
      setBusy(false);
    }
  }

  const editingRecord = editing ? listings.find((c) => c.id === editing) : null;

  return (
    <div className="space-y-5">
      <NoticeBar notice={notice} onDismiss={() => setNotice(null)} />

      <div>
        <h1 className="text-xl font-semibold text-white">Refurbished &amp; open box</h1>
        <p className="mt-1 max-w-3xl text-sm text-ink-400">
          {listings.length} listing{listings.length === 1 ? '' : 's'}. These appear on{' '}
          <Link href="/refurbished" className="text-gold-400 hover:text-gold-300">
            /refurbished
          </Link>{' '}
          and alongside new stock in their own category.
        </p>
      </div>

      <Card className="p-5">
        <h2 className="text-sm font-semibold tracking-wide text-white uppercase">
          Adding a unit
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink-300">
          Go to{' '}
          <Link href="/admin/content/products" className="text-gold-400 hover:text-gold-300">
            Products
          </Link>
          , find the same item sold new, and press <span className="text-ink-100">Duplicate</span>.
          That gives you a separate draft to set the condition and price on.
        </p>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink-400">
          Do not change the original to refurbished. That row is the new product and past orders
          point at it, so editing it would rewrite what somebody already bought.
        </p>
      </Card>

      {editingRecord ? (
        <RefurbishedForm
          key={editingRecord.id}
          record={editingRecord}
          busy={busy}
          onCancel={() => setEditing(null)}
          onSubmit={(values) =>
            save(editingRecord.id, values, `${editingRecord.brand} ${editingRecord.model}`)
          }
        />
      ) : null}

      <Card className="overflow-hidden">
        <div className="border-b border-ink-700 px-4 py-3">
          <Input
            aria-label="Search refurbished listings"
            placeholder="Search by brand, model or SKU"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
        </div>

        <TableWrap>
          <table className="w-full min-w-[54rem] text-sm">
            <thead className="border-b border-ink-700 text-left text-xs tracking-wide text-ink-400 uppercase">
              <tr>
                <th className="px-4 py-3 font-medium">Item</th>
                <th className="px-4 py-3 font-medium">Condition</th>
                <th className="px-4 py-3 text-right font-medium">Price</th>
                <th className="px-4 py-3 text-right font-medium">Stock</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-700">
              {listings.map((item) => (
                <tr key={item.id} className={item.status === 'published' ? '' : 'opacity-70'}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">
                      {item.brand} {item.model}
                    </p>
                    <p className="text-xs text-ink-400">{CATEGORY_LABELS[item.category]}</p>
                    {item.condition_notes ? (
                      <p className="mt-1 max-w-lg text-xs leading-relaxed text-ink-300">
                        {item.condition_notes}
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-danger-400">
                        No condition note — this cannot be published without one.
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone="warn">{CONDITION_LABELS[item.condition]}</Badge>
                  </td>
                  <td className="tnum px-4 py-3 text-right text-ink-100">
                    {formatMoney(item.price_cents)}
                  </td>
                  <td className="tnum px-4 py-3 text-right">
                    <span className={item.stock_quantity > 0 ? 'text-ink-200' : 'text-danger-400'}>
                      {item.stock_quantity}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1 text-xs">
                      <button
                        type="button"
                        onClick={() => setEditing(item.id)}
                        className="text-gold-400 hover:text-gold-300"
                      >
                        Edit
                      </button>
                      {item.status === 'published' ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            save(item.id, { status: 'draft' }, `${item.brand} ${item.model}`)
                          }
                          className="text-ink-400 hover:text-white disabled:opacity-40"
                        >
                          Unpublish
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={busy || !item.condition_notes}
                          title={
                            item.condition_notes
                              ? undefined
                              : 'Add a condition note before publishing.'
                          }
                          onClick={() =>
                            save(item.id, { status: 'published' }, `${item.brand} ${item.model}`)
                          }
                          className="text-ok-400 hover:text-ok-500 disabled:opacity-40"
                        >
                          Publish
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          save(item.id, { status: 'archived' }, `${item.brand} ${item.model}`)
                        }
                        className="text-ink-400 hover:text-danger-400 disabled:opacity-40"
                      >
                        Sold / archive
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {listings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-ink-400">
                    No refurbished or open-box units listed.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </TableWrap>
      </Card>
    </div>
  );
}

function RefurbishedForm({
  record,
  busy,
  onSubmit,
  onCancel,
}: {
  record: ComponentRecord;
  busy: boolean;
  onSubmit: (values: Record<string, unknown>) => void;
  onCancel: () => void;
}) {
  const [condition, setCondition] = useState<ComponentCondition>(record.condition);
  const [notes, setNotes] = useState(record.condition_notes ?? '');
  const [price, setPrice] = useState((record.price_cents / 100).toFixed(2));
  const [status, setStatus] = useState<ContentStatus>(record.status);

  const needsNotes = condition !== 'new';

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">
            {record.brand} {record.model}
          </h2>
          <p className="font-mono text-xs text-ink-500">{record.sku}</p>
        </div>
        <button type="button" onClick={onCancel} className="text-sm text-ink-400 hover:text-white">
          Close
        </button>
      </div>

      <form
        className="mt-5 space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({
            condition,
            condition_notes: needsNotes ? notes.trim() : null,
            price_cents: Math.round(Number(price) * 100),
            status,
          });
        }}
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Condition" htmlFor="rf-condition">
            <Select
              id="rf-condition"
              value={condition}
              onChange={(e) => setCondition(e.target.value as ComponentCondition)}
            >
              {COMPONENT_CONDITIONS.map((c) => (
                <option key={c} value={c}>
                  {CONDITION_LABELS[c]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Price (CAD)" htmlFor="rf-price" required>
            <Input
              id="rf-price"
              type="number"
              min="0"
              step="0.01"
              value={price}
              required
              onChange={(e) => setPrice(e.target.value)}
            />
          </Field>
          <Field label="Status" htmlFor="rf-status">
            <Select
              id="rf-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as ContentStatus)}
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived / sold</option>
            </Select>
          </Field>
        </div>

        <Field
          label="Condition notes"
          htmlFor="rf-notes"
          required={needsNotes}
          hint="What was tested, what was replaced, any cosmetic marks, and the warranty you are offering. Printed on the listing word for word."
        >
          <Textarea
            id="rf-notes"
            rows={3}
            value={notes}
            required={needsNotes}
            minLength={needsNotes ? 10 : undefined}
            disabled={!needsNotes}
            placeholder="Customer return, unopened accessories. Tested four hours under load, no faults. 90-day warranty."
            onChange={(e) => setNotes(e.target.value)}
          />
        </Field>

        <p className="rounded-md border border-ink-700 bg-ink-900 px-4 py-3 text-xs text-ink-400">
          Stock is <span className="tnum text-ink-100">{record.stock_quantity}</span>, changed in{' '}
          <Link href="/admin/inventory" className="text-gold-400 hover:text-gold-300">
            Inventory
          </Link>
          . For a one-off unit, set it to 1 there and archive this listing once it sells.
        </p>

        <div className="flex items-center gap-3 border-t border-ink-700 pt-5">
          <Button type="submit" disabled={busy}>
            {busy ? 'Saving…' : 'Save changes'}
          </Button>
          <button type="button" onClick={onCancel} className="text-sm text-ink-400 hover:text-ink-200">
            Cancel
          </button>
        </div>
      </form>
    </Card>
  );
}
