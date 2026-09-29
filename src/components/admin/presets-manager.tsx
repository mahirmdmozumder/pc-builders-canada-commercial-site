'use client';

import { useMemo, useState } from 'react';
import { Button, Card, Field, Input, Select, Textarea } from '@/components/ui';
import { formatMoney, slugify } from '@/lib/utils';
import type { PublicComponent } from '@/lib/catalog/types';
import type { SavedBuildItem } from '@/types/domain';
import {
  PRESET_AUDIENCES,
  PRESET_AUDIENCE_LABELS,
  type BuildPresetRecord,
  type ContentStatus,
  type PresetAudience,
} from '@/lib/cms/types';
import {
  DisplayControls,
  SeoFields,
  SlugField,
  StatusBadge,
  StatusSelect,
  StringListEditor,
} from '@/components/admin/content-controls';
import { GalleryUpload, ImageUpload } from '@/components/admin/image-upload';
import { BuildItemsPicker } from '@/components/admin/build-items-picker';
import { CollectionShell, RowActions, useCollectionApi } from '@/components/admin/collection-shell';

/**
 * Build presets: the starting configurations on /gaming-pcs and /workstations.
 *
 * A preset has no price of its own. The total comes from the catalogue rows it
 * references, computed fresh every time the page renders, so a preset can
 * never advertise a figure the parts no longer cost. That is why the form
 * shows a live total rather than asking for one.
 */
export function PresetsManager({
  presets,
  catalogue,
}: {
  presets: BuildPresetRecord[];
  catalogue: PublicComponent[];
}) {
  const api = useCollectionApi('/api/admin/presets');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ContentStatus>('all');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  const byId = useMemo(() => new Map(catalogue.map((c) => [c.id, c])), [catalogue]);

  function priceOf(preset: BuildPresetRecord) {
    return preset.items.reduce((sum, item) => {
      const component = byId.get(item.component_id);
      return sum + (component ? component.price_cents * item.quantity : 0);
    }, 0);
  }

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return presets.filter((p) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (!q) return true;
      return `${p.name} ${p.slug} ${p.tagline}`.toLowerCase().includes(q);
    });
  }, [presets, search, statusFilter]);

  const editingRecord = editing ? presets.find((p) => p.id === editing) : null;

  return (
    <CollectionShell
      title="PC builds"
      description="Starting configurations customers load into the configurator and change. Parts are picked from the catalogue so the price stays live."
      addLabel={creating ? 'Cancel' : 'Add build'}
      items={visible}
      search={search}
      onSearchChange={setSearch}
      statusFilter={statusFilter}
      onStatusFilterChange={setStatusFilter}
      creating={creating}
      onCreatingChange={(v) => { setCreating(v); setEditing(null); }}
      notice={api.notice}
      onDismissNotice={() => api.notify(null)}
      emptyMessage="No builds match those filters."
      headers={[
        { label: 'Build' },
        { label: 'For' },
        { label: 'Parts', align: 'right' },
        { label: 'Total', align: 'right' },
        { label: 'Status' },
        { label: 'Actions', align: 'right' },
      ]}
      form={
        creating ? (
          <PresetForm
            catalogue={catalogue}
            busy={api.busy}
            onCancel={() => setCreating(false)}
            onSubmit={async (values) => {
              if (await api.create(values, values.name as string)) setCreating(false);
            }}
          />
        ) : editingRecord ? (
          <PresetForm
            key={editingRecord.id}
            record={editingRecord}
            catalogue={catalogue}
            busy={api.busy}
            onCancel={() => setEditing(null)}
            onSubmit={async (values) => {
              if (await api.update(editingRecord.id, values, editingRecord.name)) setEditing(null);
            }}
          />
        ) : null
      }
      renderRow={(preset) => (
        <tr key={preset.id} className={preset.status === 'published' ? '' : 'opacity-70'}>
          <td className="px-4 py-3">
            <p className="font-medium text-white">
              {preset.name}
              {preset.featured ? <span className="ml-2 text-xs text-gold-400">★</span> : null}
            </p>
            <p className="max-w-md truncate text-xs text-ink-400">{preset.tagline}</p>
          </td>
          <td className="px-4 py-3 text-ink-300">{PRESET_AUDIENCE_LABELS[preset.audience]}</td>
          <td className="tnum px-4 py-3 text-right text-ink-300">{preset.items.length}</td>
          <td className="tnum px-4 py-3 text-right text-ink-100">
            {priceOf(preset) > 0 ? formatMoney(priceOf(preset)) : '—'}
          </td>
          <td className="px-4 py-3">
            <StatusBadge status={preset.status} />
          </td>
          <td className="px-4 py-3">
            <RowActions
              status={preset.status}
              busy={api.busy}
              onEdit={() => { setEditing(preset.id); setCreating(false); }}
              onPublish={() => api.update(preset.id, { status: 'published' }, preset.name)}
              onUnpublish={() => api.update(preset.id, { status: 'draft' }, preset.name)}
              onArchive={() => api.archive(preset.id, preset.name)}
            />
          </td>
        </tr>
      )}
    />
  );
}

function PresetForm({
  record,
  catalogue,
  busy,
  onSubmit,
  onCancel,
}: {
  record?: BuildPresetRecord;
  catalogue: PublicComponent[];
  busy: boolean;
  onSubmit: (values: Record<string, unknown>) => void;
  onCancel: () => void;
}) {
  const isEdit = Boolean(record);
  const [name, setName] = useState(record?.name ?? '');
  const [slug, setSlug] = useState(record?.slug ?? '');
  const [audience, setAudience] = useState<PresetAudience>(record?.audience ?? 'gaming');
  const [tagline, setTagline] = useState(record?.tagline ?? '');
  const [rationale, setRationale] = useState(record?.rationale ?? '');
  const [highlights, setHighlights] = useState<string[]>(record?.highlights ?? []);
  const [items, setItems] = useState<SavedBuildItem[]>(record?.items ?? []);
  const [heroImage, setHeroImage] = useState<string | null>(record?.hero_image_url ?? null);
  const [gallery, setGallery] = useState<string[]>(record?.gallery_urls ?? []);
  const [status, setStatus] = useState<ContentStatus>(record?.status ?? 'draft');
  const [featured, setFeatured] = useState(record?.featured ?? false);
  const [sortOrder, setSortOrder] = useState(record?.sort_order ?? 0);
  const [seoTitle, setSeoTitle] = useState(record?.seo_title ?? '');
  const [seoDescription, setSeoDescription] = useState(record?.seo_description ?? '');

  const suggestedSlug = slugify(name).slice(0, 110);

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-lg font-semibold text-white">{isEdit ? record!.name : 'New build'}</h2>
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
            audience,
            tagline: tagline.trim(),
            rationale: rationale.trim(),
            highlights,
            items,
            hero_image_url: heroImage,
            gallery_urls: gallery,
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
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Build name" htmlFor="pf-name" required>
            <Input id="pf-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </Field>
          <SlugField id="pf-slug" value={slug} onChange={setSlug} suggestion={suggestedSlug} />
          <Field label="Listed under" htmlFor="pf-audience" hint="Which public page it appears on.">
            <Select
              id="pf-audience"
              value={audience}
              onChange={(e) => setAudience(e.target.value as PresetAudience)}
            >
              {PRESET_AUDIENCES.map((a) => (
                <option key={a} value={a}>
                  {PRESET_AUDIENCE_LABELS[a]}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Tagline" htmlFor="pf-tagline" hint="One line on who this build is for.">
          <Input id="pf-tagline" value={tagline} onChange={(e) => setTagline(e.target.value)} />
        </Field>

        <Field
          label="Why these parts"
          htmlFor="pf-rationale"
          hint="What the choices are optimising for. Customers can and do argue with this, which is the point."
        >
          <Textarea
            id="pf-rationale"
            rows={4}
            value={rationale}
            onChange={(e) => setRationale(e.target.value)}
          />
        </Field>

        <StringListEditor
          id="pf-highlights"
          label="Highlights"
          hint="Short, checkable claims about the configuration. One per line. Avoid frame-rate promises — they depend on the game."
          value={highlights}
          onChange={setHighlights}
        />

        <BuildItemsPicker catalogue={catalogue} items={items} onChange={setItems} />

        <ImageUpload value={heroImage} onChange={setHeroImage} folder="builds" label="Hero image" />
        <GalleryUpload value={gallery} onChange={setGallery} folder="builds" />

        <div className="grid gap-4 border-t border-ink-700 pt-5 sm:grid-cols-2">
          <StatusSelect id="pf-status" value={status} onChange={setStatus} />
          <div />
        </div>

        <DisplayControls
          idPrefix="pf"
          featured={featured}
          sortOrder={sortOrder}
          onFeaturedChange={setFeatured}
          onSortOrderChange={setSortOrder}
          featuredHint="Featured builds appear on the homepage."
        />

        <SeoFields
          idPrefix="pf"
          title={seoTitle}
          description={seoDescription}
          onTitleChange={setSeoTitle}
          onDescriptionChange={setSeoDescription}
        />

        <div className="flex items-center gap-3 border-t border-ink-700 pt-5">
          <Button type="submit" disabled={busy}>
            {busy ? 'Saving…' : isEdit ? 'Save changes' : 'Create build'}
          </Button>
          <button type="button" onClick={onCancel} className="text-sm text-ink-400 hover:text-ink-200">
            Cancel
          </button>
        </div>
      </form>
    </Card>
  );
}
