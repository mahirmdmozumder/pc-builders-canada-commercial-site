'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Badge, Button, Card, Field, Input, Select, TableWrap, Textarea } from '@/components/ui';
import { formatMoney, slugify } from '@/lib/utils';
import {
  CATEGORY_LABELS,
  COMPONENT_CATEGORIES,
  type ComponentCategory,
  type ComponentRecord,
} from '@/lib/catalog/types';

/**
 * Component catalogue management.
 *
 * Deactivation rather than deletion: these rows are referenced by historical
 * orders and saved builds, and rewriting them would rewrite what a customer
 * bought. Deactivated parts vanish from the configurator and stay in the
 * record.
 */
export function ComponentManager({ components }: { components: ComponentRecord[] }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<ComponentCategory | 'all'>('all');
  const [showInactive, setShowInactive] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: 'ok' | 'danger'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return components.filter((component) => {
      if (category !== 'all' && component.category !== category) return false;
      if (!showInactive && !component.active) return false;
      if (!q) return true;
      return `${component.brand} ${component.model} ${component.sku} ${component.id}`
        .toLowerCase()
        .includes(q);
    });
  }, [components, query, category, showInactive]);

  async function submit(url: string, method: 'POST' | 'PATCH' | 'DELETE', body?: unknown) {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(url, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage({ tone: 'danger', text: data.error ?? 'That did not work.' });
        return false;
      }
      setMessage({ tone: 'ok', text: 'Saved.' });
      router.refresh();
      return true;
    } catch {
      setMessage({ tone: 'danger', text: 'Could not reach the server.' });
      return false;
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-white">Components</h1>
        <Button onClick={() => setCreating((v) => !v)} variant={creating ? 'secondary' : 'primary'}>
          {creating ? 'Cancel' : 'Add component'}
        </Button>
      </div>

      {message ? <Alert tone={message.tone}>{message.text}</Alert> : null}

      {creating ? (
        <Card className="p-5">
          <h2 className="text-lg font-semibold text-white">New component</h2>
          <p className="mt-1 text-sm text-ink-400">
            Created as unverified sample data unless you mark the specifications as checked. The
            public site labels unverified rows.
          </p>
          <ComponentForm
            busy={busy}
            onSubmit={async (values) => {
              const okResult = await submit('/api/admin/components', 'POST', values);
              if (okResult) setCreating(false);
            }}
          />
        </Card>
      ) : null}

      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search brand, model, SKU"
            aria-label="Search components"
            className="sm:max-w-xs"
          />
          <Select
            value={category}
            onChange={(e) => setCategory(e.target.value as ComponentCategory | 'all')}
            aria-label="Filter by category"
            className="sm:max-w-[200px]"
          >
            <option value="all">All categories</option>
            {COMPONENT_CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {CATEGORY_LABELS[value]}
              </option>
            ))}
          </Select>
          <label className="flex items-center gap-2 text-sm text-ink-300">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="size-4 rounded border-ink-600 bg-ink-900 accent-maple-500"
            />
            Show deactivated
          </label>
          <span className="tnum ml-auto text-sm text-ink-400">{rows.length} shown</span>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <TableWrap>
          <table className="w-full text-sm">
            <caption className="sr-only">Component catalogue</caption>
            <thead>
              <tr className="border-b border-ink-700 text-left text-xs tracking-wide text-ink-400 uppercase">
                <th scope="col" className="px-4 py-3 font-medium">Component</th>
                <th scope="col" className="px-4 py-3 font-medium">Category</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Cost</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Price</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Margin</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Stock</th>
                <th scope="col" className="px-4 py-3 font-medium">State</th>
                <th scope="col" className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-700">
              {rows.map((component) => {
                const margin =
                  component.cost_cents !== null && component.price_cents > 0
                    ? ((component.price_cents - component.cost_cents) / component.price_cents) * 100
                    : null;
                return (
                  <tr key={component.id} className={component.active ? '' : 'opacity-60'}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-white">
                        {component.brand} {component.model}
                      </p>
                      <p className="font-mono text-xs text-ink-500">{component.sku}</p>
                    </td>
                    <td className="px-4 py-3 text-ink-300">{CATEGORY_LABELS[component.category]}</td>
                    <td className="tnum px-4 py-3 text-right text-ink-300">
                      {component.cost_cents !== null ? formatMoney(component.cost_cents) : '—'}
                    </td>
                    <td className="tnum px-4 py-3 text-right text-ink-100">
                      {formatMoney(component.price_cents)}
                    </td>
                    <td className="tnum px-4 py-3 text-right text-ink-300">
                      {margin !== null ? `${margin.toFixed(0)}%` : '—'}
                    </td>
                    <td className="tnum px-4 py-3 text-right">
                      <span
                        className={
                          component.stock_quantity <= component.low_stock_threshold
                            ? 'text-warn-400'
                            : 'text-ink-200'
                        }
                      >
                        {component.stock_quantity}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {component.active ? (
                          <Badge tone="ok">Active</Badge>
                        ) : (
                          <Badge tone="neutral">Off</Badge>
                        )}
                        {component.data_confidence === 'sample' ? (
                          <Badge tone="info">Unverified</Badge>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setEditing(editing === component.id ? null : component.id)}
                        className="text-sm text-maple-400 hover:text-maple-300"
                      >
                        {editing === component.id ? 'Close' : 'Edit'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableWrap>
      </Card>

      {editing ? (
        <EditPanel
          component={components.find((c) => c.id === editing)!}
          busy={busy}
          onSave={(values) => submit(`/api/admin/components/${editing}`, 'PATCH', values)}
          onDeactivate={async () => {
            const okResult = await submit(`/api/admin/components/${editing}`, 'DELETE');
            if (okResult) setEditing(null);
          }}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </div>
  );
}

interface FormValues {
  id: string;
  sku: string;
  category: ComponentCategory;
  brand: string;
  model: string;
  description: string;
  price_cents: number;
  cost_cents: number | null;
  stock_quantity: number;
  low_stock_threshold: number;
  active: boolean;
  data_confidence: 'sample' | 'verified';
  image_url: string | null;
}

function ComponentForm({
  busy,
  onSubmit,
}: {
  busy: boolean;
  onSubmit: (values: FormValues) => void;
}) {
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [category, setCategory] = useState<ComponentCategory>('cpu');

  const suggestedId = slugify(`${category}-${brand}-${model}`).slice(0, 110);

  return (
    <form
      className="mt-5 space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        onSubmit({
          id: String(form.get('id') || suggestedId),
          sku: String(form.get('sku')),
          category,
          brand,
          model,
          description: String(form.get('description') ?? ''),
          price_cents: Math.round(Number(form.get('price')) * 100),
          cost_cents: form.get('cost') ? Math.round(Number(form.get('cost')) * 100) : null,
          stock_quantity: Number(form.get('stock') ?? 0),
          low_stock_threshold: Number(form.get('threshold') ?? 3),
          active: true,
          data_confidence: form.get('verified') ? 'verified' : 'sample',
          image_url: String(form.get('image_url') ?? '') || null,
        });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Category" htmlFor="new-category" required>
          <Select
            id="new-category"
            value={category}
            onChange={(e) => setCategory(e.target.value as ComponentCategory)}
          >
            {COMPONENT_CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {CATEGORY_LABELS[value]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Brand" htmlFor="new-brand" required>
          <Input id="new-brand" value={brand} onChange={(e) => setBrand(e.target.value)} required />
        </Field>
        <Field label="Model" htmlFor="new-model" required>
          <Input id="new-model" value={model} onChange={(e) => setModel(e.target.value)} required />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="SKU" htmlFor="new-sku" required>
          <Input id="new-sku" name="sku" required maxLength={60} />
        </Field>
        <Field label="Id" htmlFor="new-id" hint={`Leave blank to use ${suggestedId || 'a generated id'}`}>
          <Input id="new-id" name="id" placeholder={suggestedId} />
        </Field>
      </div>

      <Field label="Description" htmlFor="new-description">
        <Textarea id="new-description" name="description" rows={3} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-4">
        <Field label="Price (CAD)" htmlFor="new-price" required>
          <Input id="new-price" name="price" type="number" min="0" step="0.01" required />
        </Field>
        <Field label="Cost (CAD)" htmlFor="new-cost">
          <Input id="new-cost" name="cost" type="number" min="0" step="0.01" />
        </Field>
        <Field label="Stock" htmlFor="new-stock" required>
          <Input id="new-stock" name="stock" type="number" min="0" defaultValue={0} required />
        </Field>
        <Field label="Low stock at" htmlFor="new-threshold">
          <Input id="new-threshold" name="threshold" type="number" min="0" defaultValue={3} />
        </Field>
      </div>

      <Field label="Image URL" htmlFor="new-image">
        <Input id="new-image" name="image_url" type="url" placeholder="https://" />
      </Field>

      <label className="flex items-center gap-2 text-sm text-ink-300">
        <input
          type="checkbox"
          name="verified"
          className="size-4 rounded border-ink-600 bg-ink-900 accent-maple-500"
        />
        I have checked these specifications against the manufacturer spec sheet
      </label>

      <Button type="submit" disabled={busy}>
        {busy ? 'Saving...' : 'Create component'}
      </Button>
    </form>
  );
}

function EditPanel({
  component,
  busy,
  onSave,
  onDeactivate,
  onClose,
}: {
  component: ComponentRecord;
  busy: boolean;
  onSave: (values: Record<string, unknown>) => void;
  onDeactivate: () => void;
  onClose: () => void;
}) {
  const [confirming, setConfirming] = useState(false);

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">
            {component.brand} {component.model}
          </h2>
          <p className="font-mono text-xs text-ink-500">
            {component.id} · {component.sku}
          </p>
        </div>
        <button type="button" onClick={onClose} className="text-sm text-ink-400 hover:text-white">
          Close
        </button>
      </div>

      <form
        className="mt-5 space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          onSave({
            brand: String(form.get('brand')),
            model: String(form.get('model')),
            description: String(form.get('description') ?? ''),
            price_cents: Math.round(Number(form.get('price')) * 100),
            cost_cents: form.get('cost') ? Math.round(Number(form.get('cost')) * 100) : null,
            stock_quantity: Number(form.get('stock')),
            low_stock_threshold: Number(form.get('threshold')),
            active: form.get('active') === 'on',
            data_confidence: form.get('verified') === 'on' ? 'verified' : 'sample',
            image_url: String(form.get('image_url') ?? '') || null,
          });
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Brand" htmlFor="edit-brand">
            <Input id="edit-brand" name="brand" defaultValue={component.brand} />
          </Field>
          <Field label="Model" htmlFor="edit-model">
            <Input id="edit-model" name="model" defaultValue={component.model} />
          </Field>
        </div>

        <Field label="Description" htmlFor="edit-description">
          <Textarea id="edit-description" name="description" rows={3} defaultValue={component.description} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-4">
          <Field label="Price (CAD)" htmlFor="edit-price">
            <Input
              id="edit-price"
              name="price"
              type="number"
              min="0"
              step="0.01"
              defaultValue={(component.price_cents / 100).toFixed(2)}
            />
          </Field>
          <Field label="Cost (CAD)" htmlFor="edit-cost">
            <Input
              id="edit-cost"
              name="cost"
              type="number"
              min="0"
              step="0.01"
              defaultValue={component.cost_cents !== null ? (component.cost_cents / 100).toFixed(2) : ''}
            />
          </Field>
          <Field label="Stock" htmlFor="edit-stock">
            <Input id="edit-stock" name="stock" type="number" min="0" defaultValue={component.stock_quantity} />
          </Field>
          <Field label="Low stock at" htmlFor="edit-threshold">
            <Input
              id="edit-threshold"
              name="threshold"
              type="number"
              min="0"
              defaultValue={component.low_stock_threshold}
            />
          </Field>
        </div>

        <Field label="Image URL" htmlFor="edit-image">
          <Input id="edit-image" name="image_url" type="url" defaultValue={component.image_url ?? ''} />
        </Field>

        <div className="flex flex-wrap gap-5">
          <label className="flex items-center gap-2 text-sm text-ink-300">
            <input
              type="checkbox"
              name="active"
              defaultChecked={component.active}
              className="size-4 rounded border-ink-600 bg-ink-900 accent-maple-500"
            />
            Active in the configurator
          </label>
          <label className="flex items-center gap-2 text-sm text-ink-300">
            <input
              type="checkbox"
              name="verified"
              defaultChecked={component.data_confidence === 'verified'}
              className="size-4 rounded border-ink-600 bg-ink-900 accent-maple-500"
            />
            Specifications verified
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-ink-700 pt-4">
          <Button type="submit" disabled={busy}>
            {busy ? 'Saving...' : 'Save changes'}
          </Button>

          {component.active ? (
            confirming ? (
              <>
                <Button type="button" variant="danger" onClick={onDeactivate} disabled={busy}>
                  Confirm deactivate
                </Button>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  className="text-sm text-ink-400 hover:text-ink-200"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className="text-sm text-ink-400 hover:text-danger-400"
              >
                Deactivate
              </button>
            )
          ) : null}

          <p className="w-full text-xs text-ink-500">
            Deactivating hides a part from the configurator. It is never deleted, because past
            orders reference it.
          </p>
        </div>
      </form>
    </Card>
  );
}
