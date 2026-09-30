'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Badge,
  Button,
  Card,
  Field,
  Input,
  Select,
  TableWrap,
  Textarea,
} from '@/components/ui';
import { formatMoney, slugify, cn } from '@/lib/utils';
import {
  CATEGORY_LABELS,
  COMPONENT_CATEGORIES,
  COMPONENT_CONDITIONS,
  CONDITION_LABELS,
  describeVideo,
  type ComponentCategory,
  type ComponentCondition,
  type ComponentRecord,
} from '@/lib/catalog/types';
import type { ContentStatus } from '@/lib/cms/types';
import {
  ConfirmButton,
  DisplayControls,
  NoticeBar,
  SeoFields,
  StatusBadge,
  StatusSelect,
  type Notice,
} from '@/components/admin/content-controls';
import { GalleryUpload, ImageUpload } from '@/components/admin/image-upload';
import {
  ProvenanceEditor,
  SpecsEditor,
  TypedFieldsEditor,
  type SpecBag,
} from '@/components/admin/spec-editor';
import { TYPED_FIELDS } from '@/lib/cms/spec-fields';

/**
 * Product catalogue management.
 *
 * Extends the original screen rather than replacing it: the same deactivation
 * model, the same cost-price handling, the same activity logging. What is new
 * is everything the storefront needs that used to require a database edit —
 * images, specifications, publication state, ordering and SEO.
 *
 * STOCK IS NOT EDITED HERE. It is shown, because deciding whether to publish
 * something you have none of is a reasonable thing to want to know, but the
 * number is read-only and links to /admin/inventory. Two screens that both
 * write stock is how stock counts end up wrong.
 */

const PAGE_SIZE = 25;

type StatusFilter = 'all' | ContentStatus;
type StockFilter = 'all' | 'in-stock' | 'low' | 'out';
type SortKey = 'updated' | 'name' | 'price-asc' | 'price-desc' | 'stock' | 'order';

export function ComponentManager({ components }: { components: ComponentRecord[] }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<ComponentCategory | 'all'>('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [stock, setStock] = useState<StockFilter>('all');
  const [sort, setSort] = useState<SortKey>('updated');
  const [page, setPage] = useState(0);

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = components.filter((c) => {
      if (category !== 'all' && c.category !== category) return false;
      if (status !== 'all' && c.status !== status) return false;
      if (stock === 'in-stock' && c.stock_quantity <= 0) return false;
      if (stock === 'out' && c.stock_quantity > 0) return false;
      if (stock === 'low' && !(c.stock_quantity > 0 && c.stock_quantity <= c.low_stock_threshold))
        return false;
      if (!q) return true;
      return `${c.brand} ${c.model} ${c.sku} ${c.id}`.toLowerCase().includes(q);
    });

    rows = [...rows].sort((a, b) => {
      switch (sort) {
        case 'name':
          return `${a.brand} ${a.model}`.localeCompare(`${b.brand} ${b.model}`);
        case 'price-asc':
          return a.price_cents - b.price_cents;
        case 'price-desc':
          return b.price_cents - a.price_cents;
        case 'stock':
          return a.stock_quantity - b.stock_quantity;
        case 'order':
          return a.sort_order - b.sort_order || a.brand.localeCompare(b.brand);
        default:
          return (b.updated_at ?? '').localeCompare(a.updated_at ?? '');
      }
    });
    return rows;
  }, [components, query, category, status, stock, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const visible = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  const editingRecord = editing ? components.find((c) => c.id === editing) : null;

  async function send(url: string, method: string, body: unknown, successText: string) {
    setBusy(true);
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'That did not save.');
      setNotice({ tone: 'ok', text: successText });
      setCreating(false);
      setEditing(null);
      router.refresh();
      return true;
    } catch (err) {
      setNotice({ tone: 'danger', text: err instanceof Error ? err.message : 'Something failed.' });
      return false;
    } finally {
      setBusy(false);
    }
  }

  /**
   * Duplicating reuses the create endpoint rather than adding a route.
   *
   * The copy comes back as a DRAFT with " (copy)" on the model and a fresh id,
   * so it can never be mistaken for the original or appear on the site before
   * somebody has looked at it.
   */
  async function duplicate(source: ComponentRecord) {
    const suffix = Date.now().toString(36).slice(-4);
    const payload = {
      ...stripForWrite(source),
      id: `${source.id}-copy-${suffix}`.slice(0, 120),
      sku: `${source.sku}-C${suffix}`.slice(0, 60),
      model: `${source.model} (copy)`.slice(0, 160),
      status: 'draft' as const,
      featured: false,
    };
    await send('/api/admin/components', 'POST', payload, `Duplicated ${source.brand} ${source.model} as a draft.`);
  }

  async function setStatusFor(component: ComponentRecord, next: ContentStatus) {
    await send(
      `/api/admin/components/${component.id}`,
      'PATCH',
      { status: next },
      `${component.brand} ${component.model} is now ${next}.`,
    );
  }

  return (
    <div className="space-y-5">
      <NoticeBar notice={notice} onDismiss={() => setNotice(null)} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-white">Products</h1>
          <p className="mt-1 text-sm text-ink-400">
            {filtered.length} of {components.length} shown. Stock is managed in{' '}
            <Link href="/admin/inventory" className="text-gold-400 hover:text-gold-300">
              Inventory
            </Link>
            .
          </p>
        </div>
        <Button onClick={() => { setCreating((v) => !v); setEditing(null); }}>
          {creating ? 'Cancel' : 'Add product'}
        </Button>
      </div>

      {creating ? (
        <ComponentForm
          busy={busy}
          onCancel={() => setCreating(false)}
          onSubmit={(values) =>
            send('/api/admin/components', 'POST', values, `Created ${values.brand} ${values.model}.`)
          }
        />
      ) : null}

      {editingRecord ? (
        <ComponentForm
          key={editingRecord.id}
          record={editingRecord}
          busy={busy}
          onCancel={() => setEditing(null)}
          onSubmit={(values) =>
            send(
              `/api/admin/components/${editingRecord.id}`,
              'PATCH',
              values,
              `Saved ${values.brand} ${values.model}.`,
            )
          }
        />
      ) : null}

      <Card className="overflow-hidden">
        <div className="grid gap-3 border-b border-ink-700 px-4 py-3 sm:grid-cols-2 lg:grid-cols-5">
          <Input
            aria-label="Search products"
            placeholder="Search name, SKU or id"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(0); }}
          />
          <Select
            aria-label="Filter by category"
            value={category}
            onChange={(e) => { setCategory(e.target.value as ComponentCategory | 'all'); setPage(0); }}
          >
            <option value="all">All categories</option>
            {COMPONENT_CATEGORIES.map((c) => (
              <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
            ))}
          </Select>
          <Select
            aria-label="Filter by status"
            value={status}
            onChange={(e) => { setStatus(e.target.value as StatusFilter); setPage(0); }}
          >
            <option value="all">Any status</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </Select>
          <Select
            aria-label="Filter by stock"
            value={stock}
            onChange={(e) => { setStock(e.target.value as StockFilter); setPage(0); }}
          >
            <option value="all">Any stock</option>
            <option value="in-stock">In stock</option>
            <option value="low">Low stock</option>
            <option value="out">Out of stock</option>
          </Select>
          <Select aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
            <option value="updated">Recently updated</option>
            <option value="name">Name A–Z</option>
            <option value="price-asc">Price, low to high</option>
            <option value="price-desc">Price, high to low</option>
            <option value="stock">Stock, low to high</option>
            <option value="order">Display order</option>
          </Select>
        </div>

        <TableWrap>
          <table className="w-full min-w-[60rem] text-sm">
            <thead className="border-b border-ink-700 text-left text-xs tracking-wide text-ink-400 uppercase">
              <tr>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 text-right font-medium">Price</th>
                <th className="px-4 py-3 text-right font-medium">Stock</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Updated</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-700">
              {visible.map((component) => (
                <tr key={component.id} className={component.status === 'published' ? '' : 'opacity-70'}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="size-9 shrink-0 overflow-hidden rounded border border-ink-700 bg-ink-900">
                        {component.image_url ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={component.image_url} alt="" className="size-full object-cover" />
                        ) : null}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-white">
                          {component.brand} {component.model}
                          {component.featured ? (
                            <span className="ml-2 text-xs text-gold-400">★</span>
                          ) : null}
                        </p>
                        <p className="truncate font-mono text-xs text-ink-500">{component.sku}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-ink-300">{CATEGORY_LABELS[component.category]}</td>
                  <td className="tnum px-4 py-3 text-right text-ink-100">
                    {formatMoney(component.price_cents)}
                  </td>
                  <td className="tnum px-4 py-3 text-right">
                    <StockCell component={component} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <StatusBadge status={component.status} />
                      {component.condition !== 'new' ? (
                        <Badge tone="warn">{CONDITION_LABELS[component.condition]}</Badge>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-400">
                    {component.updated_at ? new Date(component.updated_at).toLocaleDateString('en-CA') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1 text-xs">
                      <button
                        type="button"
                        onClick={() => { setEditing(component.id); setCreating(false); }}
                        className="text-gold-400 hover:text-gold-300"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => duplicate(component)}
                        className="text-ink-400 hover:text-white disabled:opacity-40"
                      >
                        Duplicate
                      </button>
                      {component.status === 'published' ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => setStatusFor(component, 'draft')}
                          className="text-ink-400 hover:text-white disabled:opacity-40"
                        >
                          Unpublish
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => setStatusFor(component, 'published')}
                          className="text-ok-400 hover:text-ok-500 disabled:opacity-40"
                        >
                          Publish
                        </button>
                      )}
                      {component.status !== 'archived' ? (
                        <ConfirmButton
                          disabled={busy}
                          confirmLabel="Archive"
                          onConfirm={() => setStatusFor(component, 'archived')}
                        >
                          Archive
                        </ConfirmButton>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-ink-400">
                    Nothing matches those filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </TableWrap>

        {pageCount > 1 ? (
          <div className="flex items-center justify-between border-t border-ink-700 px-4 py-3 text-sm">
            <span className="text-ink-400">
              Page {safePage + 1} of {pageCount}
            </span>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={safePage === 0}
                onClick={() => setPage(safePage - 1)}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={safePage >= pageCount - 1}
                onClick={() => setPage(safePage + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </Card>
    </div>
  );
}

function StockCell({ component }: { component: ComponentRecord }) {
  if (component.stock_quantity <= 0) {
    return <span className="text-danger-400">0</span>;
  }
  if (component.stock_quantity <= component.low_stock_threshold) {
    return <span className="text-warn-400">{component.stock_quantity}</span>;
  }
  return <span className="text-ink-200">{component.stock_quantity}</span>;
}

// ---------------------------------------------------------------------------
// Form
// ---------------------------------------------------------------------------

type FormValues = Record<string, unknown> & { brand: string; model: string };

/**
 * Tells the operator whether the link they pasted will actually play.
 *
 * `describeVideo` is the same function the product page uses to decide what to
 * render, so this is not an approximation of the result — it IS the result. A
 * mistyped URL silently producing no video on the live page is the failure this
 * prevents, and it is the kind that goes unnoticed for months.
 */
function VideoPreview({ url }: { url: string }) {
  const trimmed = url.trim();
  if (!trimmed) return null;

  const video = describeVideo(trimmed);
  if (!video) {
    return (
      <p className="rounded-md border border-warn-500/40 bg-warn-500/10 px-3.5 py-2.5 text-xs leading-relaxed text-warn-400">
        This link will not play. Supported: a YouTube or Vimeo page URL, or a direct .mp4 / .webm
        file. The product page will show no video section rather than an empty player.
      </p>
    );
  }

  return (
    <p className="rounded-md border border-ok-600/40 bg-ok-600/10 px-3.5 py-2.5 text-xs leading-relaxed text-ok-400">
      {video.kind === 'embed'
        ? 'Recognised. It will appear as a thumbnail the visitor clicks to play, so the page does not load the player for people who never watch it.'
        : 'Recognised as a video file. It will appear with normal playback controls and will not download until played.'}
    </p>
  );
}

/** Everything a create call accepts, taken off an existing record. */
function stripForWrite(record: ComponentRecord): Record<string, unknown> {
  const typed: Record<string, unknown> = {};
  for (const field of TYPED_FIELDS[record.category] ?? []) {
    typed[field.column] = (record as unknown as Record<string, unknown>)[field.column];
  }
  return {
    category: record.category,
    brand: record.brand,
    model: record.model,
    description: record.description,
    short_description: record.short_description,
    price_cents: record.price_cents,
    cost_cents: record.cost_cents,
    stock_quantity: 0,
    low_stock_threshold: record.low_stock_threshold,
    data_confidence: record.data_confidence,
    condition: record.condition,
    condition_notes: record.condition_notes,
    image_url: record.image_url,
    gallery_urls: record.gallery_urls ?? [],
    video_url: record.video_url,
    sort_order: record.sort_order,
    seo_title: record.seo_title,
    seo_description: record.seo_description,
    specs: record.specs ?? {},
    ...typed,
  };
}

function ComponentForm({
  record,
  busy,
  onSubmit,
  onCancel,
}: {
  record?: ComponentRecord;
  busy: boolean;
  onSubmit: (values: FormValues) => void;
  onCancel: () => void;
}) {
  const isEdit = Boolean(record);

  const [category, setCategory] = useState<ComponentCategory>(record?.category ?? 'cpu');
  const [brand, setBrand] = useState(record?.brand ?? '');
  const [model, setModel] = useState(record?.model ?? '');
  const [sku, setSku] = useState(record?.sku ?? '');
  const [id, setId] = useState(record?.id ?? '');
  const [shortDescription, setShortDescription] = useState(record?.short_description ?? '');
  const [description, setDescription] = useState(record?.description ?? '');
  const [price, setPrice] = useState((record ? record.price_cents / 100 : 0).toFixed(2));
  const [cost, setCost] = useState(
    record?.cost_cents != null ? (record.cost_cents / 100).toFixed(2) : '',
  );
  const [threshold, setThreshold] = useState(record?.low_stock_threshold ?? 3);
  const [status, setStatus] = useState<ContentStatus>(record?.status ?? 'draft');
  const [featured, setFeatured] = useState(record?.featured ?? false);
  const [sortOrder, setSortOrder] = useState(record?.sort_order ?? 0);
  const [imageUrl, setImageUrl] = useState<string | null>(record?.image_url ?? null);
  const [gallery, setGallery] = useState<string[]>(record?.gallery_urls ?? []);
  const [videoUrl, setVideoUrl] = useState(record?.video_url ?? '');
  const [condition, setCondition] = useState<ComponentCondition>(record?.condition ?? 'new');
  const [conditionNotes, setConditionNotes] = useState(record?.condition_notes ?? '');
  const [seoTitle, setSeoTitle] = useState(record?.seo_title ?? '');
  const [seoDescription, setSeoDescription] = useState(record?.seo_description ?? '');

  const [specs, setSpecs] = useState<SpecBag>((record?.specs as SpecBag) ?? {});
  const [typedValues, setTypedValues] = useState<Record<string, unknown>>(() => {
    const initial: Record<string, unknown> = {};
    for (const field of TYPED_FIELDS[record?.category ?? 'cpu'] ?? []) {
      initial[field.column] = record
        ? (record as unknown as Record<string, unknown>)[field.column]
        : null;
    }
    return initial;
  });

  const verified = (record?.data_confidence ?? 'sample') === 'verified';
  const [isVerified, setIsVerified] = useState(verified);
  const [unverifiedNote, setUnverifiedNote] = useState(String(specs.unverified ?? ''));
  const [priceChecked, setPriceChecked] = useState(
    String(specs.price_checked ?? new Date().toISOString().slice(0, 10)),
  );

  const suggestedId = slugify(`${category}-${brand}-${model}`).slice(0, 110);
  const suggestedSku = `${category.toUpperCase().slice(0, 4)}-${slugify(brand).toUpperCase().slice(0, 6)}-${slugify(model).toUpperCase().slice(0, 8)}`;

  function handleCategoryChange(next: ComponentCategory) {
    setCategory(next);
    // Compatibility columns differ per category, so a stale socket from a
    // previous choice must not survive the switch.
    const fresh: Record<string, unknown> = {};
    for (const field of TYPED_FIELDS[next] ?? []) fresh[field.column] = null;
    setTypedValues(fresh);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();

    const nextSpecs: SpecBag = { ...specs };
    delete nextSpecs.unverified;
    if (!isVerified && unverifiedNote.trim()) nextSpecs.unverified = unverifiedNote.trim();
    if (priceChecked) nextSpecs.price_checked = priceChecked;

    const values: FormValues = {
      category,
      brand: brand.trim(),
      model: model.trim(),
      description: description.trim(),
      short_description: shortDescription.trim() || null,
      price_cents: Math.round(Number(price) * 100),
      cost_cents: cost ? Math.round(Number(cost) * 100) : null,
      low_stock_threshold: Number(threshold),
      status,
      featured,
      sort_order: Number(sortOrder),
      image_url: imageUrl,
      gallery_urls: gallery,
      // Empty means no video. Sent as null rather than "" so the column's
      // not-blank constraint from 0009 is never the thing that rejects a save.
      video_url: videoUrl.trim() || null,
      condition,
      condition_notes: condition === 'new' ? null : conditionNotes.trim() || null,
      data_confidence: isVerified ? 'verified' : 'sample',
      seo_title: seoTitle.trim() || null,
      seo_description: seoDescription.trim() || null,
      specs: nextSpecs,
      ...typedValues,
    };

    if (!isEdit) {
      values.id = id.trim() || suggestedId;
      values.sku = sku.trim() || suggestedSku;
      values.stock_quantity = 0;
    }

    onSubmit(values);
  }

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">
            {isEdit ? `${record!.brand} ${record!.model}` : 'New product'}
          </h2>
          {isEdit ? (
            <p className="font-mono text-xs text-ink-500">
              {record!.id} · {record!.sku}
            </p>
          ) : null}
        </div>
        <button type="button" onClick={onCancel} className="text-sm text-ink-400 hover:text-white">
          Close
        </button>
      </div>

      <form className="mt-5 space-y-7" onSubmit={submit}>
        <section className="space-y-4">
          <h3 className="text-xs font-semibold tracking-wide text-ink-300 uppercase">Basics</h3>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Category" htmlFor="cf-category" required>
              <Select
                id="cf-category"
                value={category}
                disabled={isEdit}
                onChange={(e) => handleCategoryChange(e.target.value as ComponentCategory)}
              >
                {COMPONENT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                ))}
              </Select>
            </Field>
            <Field label="Brand" htmlFor="cf-brand" required>
              <Input id="cf-brand" value={brand} onChange={(e) => setBrand(e.target.value)} required />
            </Field>
            <Field label="Model" htmlFor="cf-model" required>
              <Input id="cf-model" value={model} onChange={(e) => setModel(e.target.value)} required />
            </Field>
          </div>

          {!isEdit ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="SKU" htmlFor="cf-sku" hint={`Blank uses ${suggestedSku}`}>
                <Input id="cf-sku" value={sku} placeholder={suggestedSku} onChange={(e) => setSku(e.target.value)} />
              </Field>
              <Field label="Id" htmlFor="cf-id" hint={`Blank uses ${suggestedId || 'a generated id'}`}>
                <Input id="cf-id" value={id} placeholder={suggestedId} onChange={(e) => setId(e.target.value)} />
              </Field>
            </div>
          ) : null}

          <Field
            label="Short description"
            htmlFor="cf-short"
            hint="One line, shown on product cards and listings."
          >
            <Input
              id="cf-short"
              value={shortDescription}
              maxLength={400}
              onChange={(e) => setShortDescription(e.target.value)}
            />
          </Field>

          <Field label="Full description" htmlFor="cf-description">
            <Textarea
              id="cf-description"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Price (CAD)" htmlFor="cf-price" required>
              <Input
                id="cf-price"
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
            </Field>
            <Field label="Cost (CAD)" htmlFor="cf-cost" hint="Admin only. Never sent to customers.">
              <Input id="cf-cost" type="number" min="0" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} />
            </Field>
            <Field label="Low stock at" htmlFor="cf-threshold">
              <Input
                id="cf-threshold"
                type="number"
                min="0"
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value) || 0)}
              />
            </Field>
          </div>

          {isEdit ? (
            <p className="rounded-md border border-ink-700 bg-ink-900 px-4 py-3 text-xs text-ink-400">
              Stock is <span className="tnum text-ink-100">{record!.stock_quantity}</span> and is
              changed in{' '}
              <Link href="/admin/inventory" className="text-gold-400 hover:text-gold-300">
                Inventory
              </Link>
              , not here. One screen writing stock means the count stays right.
            </p>
          ) : (
            <p className="rounded-md border border-ink-700 bg-ink-900 px-4 py-3 text-xs text-ink-400">
              New products start at zero stock. Set the real count in Inventory once it is on the
              shelf.
            </p>
          )}
        </section>

        <section className="space-y-4 border-t border-ink-700 pt-6">
          <h3 className="text-xs font-semibold tracking-wide text-ink-300 uppercase">Media</h3>
          <ImageUpload
            value={imageUrl}
            onChange={setImageUrl}
            folder="components"
            label="Primary image"
            hint="Shown on cards, in the configurator and first in the product page gallery. Without one, a category glyph is drawn instead."
          />
          <GalleryUpload value={gallery} onChange={setGallery} folder="components" />

          {/* A URL rather than only an upload, because the video an operator
              actually has is usually already on YouTube. Uploading an mp4 to the
              media bucket works too and produces a URL that lands in this same
              field. */}
          <Field
            label="Product video"
            htmlFor="cf-video"
            hint="Optional. A YouTube or Vimeo link, or a direct .mp4 / .webm URL. Appears as the last item in the gallery. Anything else is ignored rather than shown as a broken player."
          >
            <Input
              id="cf-video"
              type="url"
              value={videoUrl}
              placeholder="https://www.youtube.com/watch?v=…"
              onChange={(e) => setVideoUrl(e.target.value)}
            />
          </Field>
          <VideoPreview url={videoUrl} />
        </section>

        <section className="space-y-4 border-t border-ink-700 pt-6">
          <h3 className="text-xs font-semibold tracking-wide text-ink-300 uppercase">
            Compatibility fields
          </h3>
          <TypedFieldsEditor
            category={category}
            values={typedValues}
            onChange={(column, value) => setTypedValues((prev) => ({ ...prev, [column]: value }))}
          />
        </section>

        <section className="space-y-4 border-t border-ink-700 pt-6">
          <h3 className="text-xs font-semibold tracking-wide text-ink-300 uppercase">
            Specifications
          </h3>
          <SpecsEditor category={category} specs={specs} onChange={setSpecs} />
        </section>

        <section className="space-y-4 border-t border-ink-700 pt-6">
          <h3 className="text-xs font-semibold tracking-wide text-ink-300 uppercase">
            Condition &amp; provenance
          </h3>

          <div className="grid gap-4 sm:grid-cols-[minmax(0,14rem)_1fr]">
            <Field label="Condition" htmlFor="cf-condition">
              <Select
                id="cf-condition"
                value={condition}
                onChange={(e) => setCondition(e.target.value as ComponentCondition)}
              >
                {COMPONENT_CONDITIONS.map((c) => (
                  <option key={c} value={c}>{CONDITION_LABELS[c]}</option>
                ))}
              </Select>
            </Field>
            <Field
              label="Condition notes"
              htmlFor="cf-condition-notes"
              required={condition !== 'new'}
              hint={
                condition === 'new'
                  ? 'Only needed when the unit is not new.'
                  : 'What was tested, what was replaced, any marks, and the warranty. Printed word for word.'
              }
            >
              <Textarea
                id="cf-condition-notes"
                rows={2}
                disabled={condition === 'new'}
                required={condition !== 'new'}
                minLength={condition !== 'new' ? 10 : undefined}
                value={conditionNotes}
                className={condition === 'new' ? 'opacity-50' : undefined}
                onChange={(e) => setConditionNotes(e.target.value)}
              />
            </Field>
          </div>

          <ProvenanceEditor
            verified={isVerified}
            unverifiedNote={unverifiedNote}
            priceChecked={priceChecked}
            onVerifiedChange={setIsVerified}
            onNoteChange={setUnverifiedNote}
            onPriceCheckedChange={setPriceChecked}
          />
        </section>

        <section className="space-y-4 border-t border-ink-700 pt-6">
          <h3 className="text-xs font-semibold tracking-wide text-ink-300 uppercase">Publishing</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <StatusSelect id="cf-status" value={status} onChange={setStatus} />
            <div />
          </div>
          <DisplayControls
            idPrefix="cf"
            featured={featured}
            sortOrder={sortOrder}
            onFeaturedChange={setFeatured}
            onSortOrderChange={setSortOrder}
            featuredHint="Featured products are highlighted in listings."
          />
          <SeoFields
            idPrefix="cf"
            title={seoTitle}
            description={seoDescription}
            onTitleChange={setSeoTitle}
            onDescriptionChange={setSeoDescription}
          />
        </section>

        <div className="flex flex-wrap items-center gap-3 border-t border-ink-700 pt-5">
          <Button type="submit" disabled={busy}>
            {busy ? 'Saving…' : isEdit ? 'Save changes' : 'Create product'}
          </Button>
          <button type="button" onClick={onCancel} className="text-sm text-ink-400 hover:text-ink-200">
            Cancel
          </button>
          <span className={cn('text-xs', status === 'published' ? 'text-ok-400' : 'text-ink-400')}>
            {status === 'published'
              ? 'Saving publishes this to the site immediately.'
              : 'Saved as a draft — nothing public changes.'}
          </span>
        </div>
      </form>
    </Card>
  );
}
