'use client';

import { useMemo, useState } from 'react';
import { Button, Card, Field, Input, Textarea } from '@/components/ui';
import { slugify } from '@/lib/utils';
import type { ContentStatus } from '@/lib/cms/types';
import type { ServiceRecord } from '@/lib/cms/types';
import {
  DisplayControls,
  SeoFields,
  SlugField,
  StatusBadge,
  StatusSelect,
  StringListEditor,
} from '@/components/admin/content-controls';
import { ImageUpload } from '@/components/admin/image-upload';
import {
  CollectionShell,
  RowActions,
  useCollectionApi,
} from '@/components/admin/collection-shell';

/**
 * Services shown on /services.
 *
 * The `note` field is the one worth understanding. Several services on the
 * public page carry a caveat — that an upgrade is sometimes not worth buying,
 * that optimisation results depend on what was wrong to begin with. Those
 * notes are the reason the page reads as honest rather than as a brochure,
 * so the field is given its own input with an explanation rather than being
 * buried in the description.
 */
export function ServicesManager({ services }: { services: ServiceRecord[] }) {
  const api = useCollectionApi('/api/admin/services');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ContentStatus>('all');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return services.filter((s) => {
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      if (!q) return true;
      return `${s.name} ${s.slug} ${s.short_description}`.toLowerCase().includes(q);
    });
  }, [services, search, statusFilter]);

  const editingRecord = editing ? services.find((s) => s.id === editing) : null;

  return (
    <CollectionShell
      title="Services"
      description="What appears on the public services page. Changes go live as soon as you save a published service."
      addLabel={creating ? 'Cancel' : 'Add service'}
      items={visible}
      search={search}
      onSearchChange={setSearch}
      statusFilter={statusFilter}
      onStatusFilterChange={setStatusFilter}
      creating={creating}
      onCreatingChange={(v) => { setCreating(v); setEditing(null); }}
      notice={api.notice}
      onDismissNotice={() => api.notify(null)}
      emptyMessage="No services match those filters."
      headers={[
        { label: 'Service' },
        { label: 'Price' },
        { label: 'Order', align: 'right' },
        { label: 'Status' },
        { label: 'Actions', align: 'right' },
      ]}
      form={
        creating ? (
          <ServiceForm
            busy={api.busy}
            onCancel={() => setCreating(false)}
            onSubmit={async (values) => {
              if (await api.create(values, values.name as string)) setCreating(false);
            }}
          />
        ) : editingRecord ? (
          <ServiceForm
            key={editingRecord.id}
            record={editingRecord}
            busy={api.busy}
            onCancel={() => setEditing(null)}
            onSubmit={async (values) => {
              if (await api.update(editingRecord.id, values, editingRecord.name)) setEditing(null);
            }}
          />
        ) : null
      }
      renderRow={(service) => (
        <tr key={service.id} className={service.status === 'published' ? '' : 'opacity-70'}>
          <td className="px-4 py-3">
            <p className="font-medium text-white">
              {service.name}
              {service.featured ? <span className="ml-2 text-xs text-gold-400">★</span> : null}
            </p>
            <p className="max-w-md truncate text-xs text-ink-400">{service.short_description}</p>
          </td>
          <td className="px-4 py-3 text-ink-300">{service.price_text ?? '—'}</td>
          <td className="tnum px-4 py-3 text-right text-ink-400">{service.sort_order}</td>
          <td className="px-4 py-3">
            <StatusBadge status={service.status} />
          </td>
          <td className="px-4 py-3">
            <RowActions
              status={service.status}
              busy={api.busy}
              onEdit={() => { setEditing(service.id); setCreating(false); }}
              onPublish={() => api.update(service.id, { status: 'published' }, service.name)}
              onUnpublish={() => api.update(service.id, { status: 'draft' }, service.name)}
              onArchive={() => api.archive(service.id, service.name)}
            />
          </td>
        </tr>
      )}
    />
  );
}

function ServiceForm({
  record,
  busy,
  onSubmit,
  onCancel,
}: {
  record?: ServiceRecord;
  busy: boolean;
  onSubmit: (values: Record<string, unknown>) => void;
  onCancel: () => void;
}) {
  const isEdit = Boolean(record);
  const [name, setName] = useState(record?.name ?? '');
  const [slug, setSlug] = useState(record?.slug ?? '');
  const [shortDescription, setShortDescription] = useState(record?.short_description ?? '');
  const [description, setDescription] = useState(record?.description ?? '');
  const [includes, setIncludes] = useState<string[]>(record?.includes ?? []);
  const [note, setNote] = useState(record?.note ?? '');
  const [priceText, setPriceText] = useState(record?.price_text ?? '');
  const [imageUrl, setImageUrl] = useState<string | null>(record?.image_url ?? null);
  const [status, setStatus] = useState<ContentStatus>(record?.status ?? 'draft');
  const [featured, setFeatured] = useState(record?.featured ?? false);
  const [sortOrder, setSortOrder] = useState(record?.sort_order ?? 0);
  const [seoTitle, setSeoTitle] = useState(record?.seo_title ?? '');
  const [seoDescription, setSeoDescription] = useState(record?.seo_description ?? '');

  const suggestedSlug = slugify(name).slice(0, 110);

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-lg font-semibold text-white">
          {isEdit ? record!.name : 'New service'}
        </h2>
        <button type="button" onClick={onCancel} className="text-sm text-ink-400 hover:text-white">
          Close
        </button>
      </div>

      <form
        className="mt-5 space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          const values: Record<string, unknown> = {
            name: name.trim(),
            slug: (slug || suggestedSlug).trim(),
            short_description: shortDescription.trim(),
            description: description.trim() || null,
            includes,
            note: note.trim() || null,
            price_text: priceText.trim() || null,
            image_url: imageUrl,
            status,
            featured,
            sort_order: Number(sortOrder),
            seo_title: seoTitle.trim() || null,
            seo_description: seoDescription.trim() || null,
          };
          if (!isEdit) values.id = (slug || suggestedSlug).trim();
          onSubmit(values);
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Service name" htmlFor="sf-name" required>
            <Input id="sf-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </Field>
          <SlugField
            id="sf-slug"
            value={slug}
            onChange={setSlug}
            suggestion={suggestedSlug}
            hint={isEdit ? 'Changing this breaks existing links to the service.' : undefined}
          />
        </div>

        <Field
          label="Short description"
          htmlFor="sf-short"
          required
          hint="One or two sentences. This is what appears on the services page."
        >
          <Textarea
            id="sf-short"
            rows={2}
            required
            minLength={10}
            value={shortDescription}
            onChange={(e) => setShortDescription(e.target.value)}
          />
        </Field>

        <StringListEditor
          id="sf-includes"
          label="What's included"
          hint="One bullet per line. These are the points listed under the service."
          value={includes}
          onChange={setIncludes}
          rows={6}
          placeholder={'Parts list review against your workload and budget\nAssembly with cable routing that does not block airflow'}
        />

        <Field
          label="Honest caveat"
          htmlFor="sf-note"
          hint="Where a service is not always worth buying, say so here. It appears under the bullets, and it is the reason this page reads as advice rather than a sales pitch."
        >
          <Textarea
            id="sf-note"
            rows={2}
            value={note}
            placeholder="We will tell you when an upgrade is not worth it."
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>

        <Field
          label="Pricing"
          htmlFor="sf-price"
          hint="Free text, not a number — most service work is quoted after diagnosis. e.g. 'From $80' or 'Quoted after diagnostics'."
        >
          <Input id="sf-price" value={priceText} onChange={(e) => setPriceText(e.target.value)} />
        </Field>

        <Field label="Full description" htmlFor="sf-description">
          <Textarea
            id="sf-description"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>

        <ImageUpload value={imageUrl} onChange={setImageUrl} folder="services" label="Image" />

        <div className="grid gap-4 border-t border-ink-700 pt-5 sm:grid-cols-2">
          <StatusSelect id="sf-status" value={status} onChange={setStatus} />
          <div />
        </div>

        <DisplayControls
          idPrefix="sf"
          featured={featured}
          sortOrder={sortOrder}
          onFeaturedChange={setFeatured}
          onSortOrderChange={setSortOrder}
          featuredHint="Featured services are listed first."
        />

        <SeoFields
          idPrefix="sf"
          title={seoTitle}
          description={seoDescription}
          onTitleChange={setSeoTitle}
          onDescriptionChange={setSeoDescription}
        />

        <div className="flex items-center gap-3 border-t border-ink-700 pt-5">
          <Button type="submit" disabled={busy}>
            {busy ? 'Saving…' : isEdit ? 'Save changes' : 'Create service'}
          </Button>
          <button type="button" onClick={onCancel} className="text-sm text-ink-400 hover:text-ink-200">
            Cancel
          </button>
        </div>
      </form>
    </Card>
  );
}
