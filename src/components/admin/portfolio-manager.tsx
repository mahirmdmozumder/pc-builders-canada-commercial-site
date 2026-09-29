'use client';

import { useMemo, useState } from 'react';
import { Button, Card, Field, Input, Textarea } from '@/components/ui';
import { slugify } from '@/lib/utils';
import type { PublicComponent } from '@/lib/catalog/types';
import type { PortfolioBuild, SavedBuildItem } from '@/types/domain';
import type { ContentStatus } from '@/lib/cms/types';
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
 * Completed builds, published to /portfolio.
 *
 * This is the one screen where the rules about what may be written matter most.
 * The portfolio documents machines that were actually built, which is why the
 * public page ships empty rather than seeded with invented work. Two fields
 * carry that forward:
 *
 *   `verified_performance_notes` is for figures that were MEASURED on the
 *   machine. Not estimated, not quoted from a review of the same parts. Its
 *   own column exists so there is no looser field to put a guess in.
 *
 *   `customer_type` describes the kind of work the machine does, not who
 *   bought it. A real customer name on a public page is somebody else's
 *   information to give, not ours.
 */
export function PortfolioManager({
  builds,
  catalogue,
}: {
  builds: PortfolioBuild[];
  catalogue: PublicComponent[];
}) {
  const api = useCollectionApi('/api/admin/portfolio');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ContentStatus>('all');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return builds.filter((b) => {
      if (statusFilter !== 'all' && b.status !== statusFilter) return false;
      if (!q) return true;
      return `${b.title} ${b.slug} ${b.purpose} ${b.summary}`.toLowerCase().includes(q);
    });
  }, [builds, search, statusFilter]);

  const editingRecord = editing ? builds.find((b) => b.id === editing) : null;

  return (
    <CollectionShell
      title="Portfolio"
      description="Machines you have actually built. Nothing here is seeded — a portfolio entry is a claim about real work, so each one starts empty and you fill it in."
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
      emptyMessage="No portfolio entries yet. Add one when a build is finished and photographed."
      headers={[
        { label: 'Build' },
        { label: 'Purpose' },
        { label: 'Images', align: 'right' },
        { label: 'Measured' },
        { label: 'Status' },
        { label: 'Actions', align: 'right' },
      ]}
      form={
        creating ? (
          <PortfolioForm
            catalogue={catalogue}
            busy={api.busy}
            onCancel={() => setCreating(false)}
            onSubmit={async (values) => {
              if (await api.create(values, values.title as string)) setCreating(false);
            }}
          />
        ) : editingRecord ? (
          <PortfolioForm
            key={editingRecord.id}
            record={editingRecord}
            catalogue={catalogue}
            busy={api.busy}
            onCancel={() => setEditing(null)}
            onSubmit={async (values) => {
              if (await api.update(editingRecord.id, values, editingRecord.title)) setEditing(null);
            }}
          />
        ) : null
      }
      renderRow={(build) => (
        <tr key={build.id} className={build.status === 'published' ? '' : 'opacity-70'}>
          <td className="px-4 py-3">
            <p className="font-medium text-white">
              {build.title}
              {build.featured ? <span className="ml-2 text-xs text-gold-400">★</span> : null}
            </p>
            <p className="max-w-md truncate text-xs text-ink-400">{build.summary}</p>
          </td>
          <td className="px-4 py-3 text-ink-300">{build.purpose}</td>
          <td className="tnum px-4 py-3 text-right text-ink-300">
            {build.image_urls?.length ?? 0}
          </td>
          <td className="px-4 py-3 text-xs">
            {build.verified_performance_notes ? (
              <span className="text-ok-400">Yes</span>
            ) : (
              <span className="text-ink-500">—</span>
            )}
          </td>
          <td className="px-4 py-3">
            <StatusBadge status={build.status} />
          </td>
          <td className="px-4 py-3">
            <RowActions
              status={build.status}
              busy={api.busy}
              onEdit={() => { setEditing(build.id); setCreating(false); }}
              onPublish={() => api.update(build.id, { status: 'published' }, build.title)}
              onUnpublish={() => api.update(build.id, { status: 'draft' }, build.title)}
              onArchive={() => api.archive(build.id, build.title)}
            />
          </td>
        </tr>
      )}
    />
  );
}

function PortfolioForm({
  record,
  catalogue,
  busy,
  onSubmit,
  onCancel,
}: {
  record?: PortfolioBuild;
  catalogue: PublicComponent[];
  busy: boolean;
  onSubmit: (values: Record<string, unknown>) => void;
  onCancel: () => void;
}) {
  const isEdit = Boolean(record);
  const [title, setTitle] = useState(record?.title ?? '');
  const [slug, setSlug] = useState(record?.slug ?? '');
  const [purpose, setPurpose] = useState(record?.purpose ?? '');
  const [customerType, setCustomerType] = useState(record?.customer_type ?? '');
  const [summary, setSummary] = useState(record?.summary ?? '');
  const [body, setBody] = useState(record?.body ?? '');
  const [items, setItems] = useState<SavedBuildItem[]>(record?.items ?? []);
  const [componentNotes, setComponentNotes] = useState<string[]>(record?.component_notes ?? []);
  const [heroImage, setHeroImage] = useState<string | null>(record?.hero_image_url ?? null);
  const [gallery, setGallery] = useState<string[]>(record?.image_urls ?? []);
  const [performance, setPerformance] = useState(record?.verified_performance_notes ?? '');
  const [completedOn, setCompletedOn] = useState(record?.completed_on ?? '');
  const [status, setStatus] = useState<ContentStatus>(record?.status ?? 'draft');
  const [featured, setFeatured] = useState(record?.featured ?? false);
  const [sortOrder, setSortOrder] = useState(record?.sort_order ?? 0);
  const [seoTitle, setSeoTitle] = useState(record?.seo_title ?? '');
  const [seoDescription, setSeoDescription] = useState(record?.seo_description ?? '');

  const suggestedSlug = slugify(title).slice(0, 110);

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-lg font-semibold text-white">
          {isEdit ? record!.title : 'New portfolio build'}
        </h2>
        <button type="button" onClick={onCancel} className="text-sm text-ink-400 hover:text-white">
          Close
        </button>
      </div>

      <form
        className="mt-5 space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({
            title: title.trim(),
            slug: (slug || suggestedSlug).trim(),
            purpose: purpose.trim(),
            customer_type: customerType.trim() || null,
            summary: summary.trim(),
            body: body.trim() || null,
            items,
            component_notes: componentNotes,
            hero_image_url: heroImage,
            image_urls: gallery,
            verified_performance_notes: performance.trim() || null,
            completed_on: completedOn || null,
            status,
            featured,
            sort_order: Number(sortOrder),
            seo_title: seoTitle.trim() || null,
            seo_description: seoDescription.trim() || null,
          });
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Build title" htmlFor="pof-title" required>
            <Input id="pof-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </Field>
          <SlugField id="pof-slug" value={slug} onChange={setSlug} suggestion={suggestedSlug} />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field
            label="Purpose"
            htmlFor="pof-purpose"
            required
            hint="What the machine is for. e.g. 4K video editing."
          >
            <Input
              id="pof-purpose"
              value={purpose}
              required
              onChange={(e) => setPurpose(e.target.value)}
            />
          </Field>
          <Field
            label="Customer type"
            htmlFor="pof-customer"
            hint="The kind of customer, never a name. e.g. Home studio."
          >
            <Input
              id="pof-customer"
              value={customerType}
              placeholder="Home studio"
              onChange={(e) => setCustomerType(e.target.value)}
            />
          </Field>
          <Field label="Completed on" htmlFor="pof-date">
            <Input
              id="pof-date"
              type="date"
              value={completedOn}
              onChange={(e) => setCompletedOn(e.target.value)}
            />
          </Field>
        </div>

        <Field label="Summary" htmlFor="pof-summary" required hint="One or two sentences for the card.">
          <Textarea
            id="pof-summary"
            rows={2}
            required
            minLength={10}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
          />
        </Field>

        <Field label="Write-up" htmlFor="pof-body" hint="The longer story: what was asked for, what was chosen, what was awkward.">
          <Textarea id="pof-body" rows={6} value={body} onChange={(e) => setBody(e.target.value)} />
        </Field>

        <BuildItemsPicker
          catalogue={catalogue}
          items={items}
          onChange={setItems}
          label="Parts from the catalogue"
        />

        <StringListEditor
          id="pof-notes"
          label="Other parts"
          hint="Parts that are not catalogue rows — customer-supplied hardware, discontinued items. One per line."
          value={componentNotes}
          onChange={setComponentNotes}
          rows={4}
        />

        <ImageUpload
          value={heroImage}
          onChange={setHeroImage}
          folder="portfolio"
          label="Hero image"
          hint="Your own photo of the finished machine."
        />
        <GalleryUpload value={gallery} onChange={setGallery} folder="portfolio" />

        <Field
          label="Measured performance"
          htmlFor="pof-performance"
          hint="Only figures you actually measured on this machine. Leave blank rather than quoting a review of the same parts — the public page presents anything here as verified."
        >
          <Textarea
            id="pof-performance"
            rows={3}
            value={performance}
            placeholder="Sustained 68°C on the CPU after a one-hour Cinebench loop, with the stock fan curve."
            onChange={(e) => setPerformance(e.target.value)}
          />
        </Field>

        <div className="grid gap-4 border-t border-ink-700 pt-5 sm:grid-cols-2">
          <StatusSelect id="pof-status" value={status} onChange={setStatus} />
          <div />
        </div>

        <DisplayControls
          idPrefix="pof"
          featured={featured}
          sortOrder={sortOrder}
          onFeaturedChange={setFeatured}
          onSortOrderChange={setSortOrder}
          featuredHint="Featured builds appear first on the portfolio page."
        />

        <SeoFields
          idPrefix="pof"
          title={seoTitle}
          description={seoDescription}
          onTitleChange={setSeoTitle}
          onDescriptionChange={setSeoDescription}
        />

        <div className="flex items-center gap-3 border-t border-ink-700 pt-5">
          <Button type="submit" disabled={busy}>
            {busy ? 'Saving…' : isEdit ? 'Save changes' : 'Create entry'}
          </Button>
          <button type="button" onClick={onCancel} className="text-sm text-ink-400 hover:text-ink-200">
            Cancel
          </button>
        </div>
      </form>
    </Card>
  );
}
