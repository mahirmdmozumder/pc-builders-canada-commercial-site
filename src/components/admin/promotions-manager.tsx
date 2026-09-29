'use client';

import { useMemo, useState } from 'react';
import { Badge, Button, Card, Field, Input, Select, Textarea } from '@/components/ui';
import {
  PROMOTION_PLACEMENTS,
  PROMOTION_PLACEMENT_LABELS,
  promotionState,
  type ContentStatus,
  type PromotionPlacement,
  type PromotionRecord,
} from '@/lib/cms/types';
import { StatusBadge, StatusSelect } from '@/components/admin/content-controls';
import { ImageUpload } from '@/components/admin/image-upload';
import { CollectionShell, RowActions, useCollectionApi } from '@/components/admin/collection-shell';

/**
 * Promotional content for the homepage.
 *
 * A promotion has two independent gates: whether it is published, and whether
 * "now" falls inside its schedule. Both have to pass for it to appear, which
 * means a published promotion can legitimately be invisible — and an admin
 * looking at the list needs to be told which of the two is holding it back
 * rather than left guessing. That is what the live column says.
 *
 * The database view applies the same rule, so the storefront and this screen
 * cannot disagree about what is showing.
 */
export function PromotionsManager({ promotions }: { promotions: PromotionRecord[] }) {
  const api = useCollectionApi('/api/admin/promotions');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ContentStatus>('all');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return promotions.filter((p) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (!q) return true;
      return `${p.title} ${p.subtitle ?? ''}`.toLowerCase().includes(q);
    });
  }, [promotions, search, statusFilter]);

  const editingRecord = editing ? promotions.find((p) => p.id === editing) : null;

  return (
    <CollectionShell
      title="Promotions"
      description="Banners and featured messages on the homepage. A promotion shows only when it is published and today falls inside its dates."
      addLabel={creating ? 'Cancel' : 'Add promotion'}
      items={visible}
      search={search}
      onSearchChange={setSearch}
      statusFilter={statusFilter}
      onStatusFilterChange={setStatusFilter}
      creating={creating}
      onCreatingChange={(v) => { setCreating(v); setEditing(null); }}
      notice={api.notice}
      onDismissNotice={() => api.notify(null)}
      emptyMessage="No promotions yet. The homepage looks the same with none."
      headers={[
        { label: 'Promotion' },
        { label: 'Placement' },
        { label: 'Showing' },
        { label: 'Status' },
        { label: 'Actions', align: 'right' },
      ]}
      form={
        creating ? (
          <PromotionForm
            busy={api.busy}
            onCancel={() => setCreating(false)}
            onSubmit={async (values) => {
              if (await api.create(values, values.title as string)) setCreating(false);
            }}
          />
        ) : editingRecord ? (
          <PromotionForm
            key={editingRecord.id}
            record={editingRecord}
            busy={api.busy}
            onCancel={() => setEditing(null)}
            onSubmit={async (values) => {
              if (await api.update(editingRecord.id, values, editingRecord.title)) setEditing(null);
            }}
          />
        ) : null
      }
      renderRow={(promo) => {
        const state = promotionState(promo);
        return (
          <tr key={promo.id} className={state.live ? '' : 'opacity-70'}>
            <td className="px-4 py-3">
              <p className="font-medium text-white">{promo.title}</p>
              {promo.subtitle ? (
                <p className="max-w-md truncate text-xs text-ink-400">{promo.subtitle}</p>
              ) : null}
            </td>
            <td className="px-4 py-3 text-xs text-ink-300">
              {PROMOTION_PLACEMENT_LABELS[promo.placement]}
            </td>
            <td className="px-4 py-3">
              <Badge tone={state.live ? 'ok' : 'neutral'}>{state.reason}</Badge>
            </td>
            <td className="px-4 py-3">
              <StatusBadge status={promo.status} />
            </td>
            <td className="px-4 py-3">
              <RowActions
                status={promo.status}
                busy={api.busy}
                onEdit={() => { setEditing(promo.id); setCreating(false); }}
                onPublish={() => api.update(promo.id, { status: 'published' }, promo.title)}
                onUnpublish={() => api.update(promo.id, { status: 'draft' }, promo.title)}
                onArchive={() => api.archive(promo.id, promo.title)}
              />
            </td>
          </tr>
        );
      }}
    />
  );
}

/** Datetime inputs want `YYYY-MM-DDTHH:mm`; Postgres returns an ISO string. */
function toLocalInput(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function PromotionForm({
  record,
  busy,
  onSubmit,
  onCancel,
}: {
  record?: PromotionRecord;
  busy: boolean;
  onSubmit: (values: Record<string, unknown>) => void;
  onCancel: () => void;
}) {
  const isEdit = Boolean(record);
  const [title, setTitle] = useState(record?.title ?? '');
  const [subtitle, setSubtitle] = useState(record?.subtitle ?? '');
  const [description, setDescription] = useState(record?.description ?? '');
  const [imageUrl, setImageUrl] = useState<string | null>(record?.image_url ?? null);
  const [buttonText, setButtonText] = useState(record?.button_text ?? '');
  const [buttonUrl, setButtonUrl] = useState(record?.button_url ?? '');
  const [startsAt, setStartsAt] = useState(toLocalInput(record?.starts_at ?? null));
  const [endsAt, setEndsAt] = useState(toLocalInput(record?.ends_at ?? null));
  const [placement, setPlacement] = useState<PromotionPlacement>(record?.placement ?? 'home-hero');
  const [status, setStatus] = useState<ContentStatus>(record?.status ?? 'draft');
  const [sortOrder, setSortOrder] = useState(record?.sort_order ?? 0);

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-lg font-semibold text-white">
          {isEdit ? record!.title : 'New promotion'}
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
            subtitle: subtitle.trim() || null,
            description: description.trim() || null,
            image_url: imageUrl,
            button_text: buttonText.trim() || null,
            button_url: buttonUrl.trim() || null,
            starts_at: startsAt ? new Date(startsAt).toISOString() : null,
            ends_at: endsAt ? new Date(endsAt).toISOString() : null,
            placement,
            status,
            sort_order: Number(sortOrder),
          });
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Title" htmlFor="prf-title" required>
            <Input id="prf-title" value={title} required onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field label="Subtitle" htmlFor="prf-subtitle">
            <Input id="prf-subtitle" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
          </Field>
        </div>

        <Field label="Description" htmlFor="prf-description">
          <Textarea
            id="prf-description"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Button text" htmlFor="prf-button-text" hint="Leave blank for no button.">
            <Input
              id="prf-button-text"
              value={buttonText}
              onChange={(e) => setButtonText(e.target.value)}
            />
          </Field>
          <Field
            label="Button link"
            htmlFor="prf-button-url"
            required={Boolean(buttonText)}
            hint="A path like /refurbished, or a full URL."
          >
            <Input
              id="prf-button-url"
              value={buttonUrl}
              placeholder="/refurbished"
              required={Boolean(buttonText)}
              onChange={(e) => setButtonUrl(e.target.value)}
            />
          </Field>
        </div>

        <ImageUpload value={imageUrl} onChange={setImageUrl} folder="promotions" label="Banner image" />

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Starts" htmlFor="prf-starts" hint="Blank means it starts as soon as it is published.">
            <Input
              id="prf-starts"
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
            />
          </Field>
          <Field label="Ends" htmlFor="prf-ends" hint="Blank means it runs until you stop it.">
            <Input
              id="prf-ends"
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
            />
          </Field>
          <Field label="Placement" htmlFor="prf-placement">
            <Select
              id="prf-placement"
              value={placement}
              onChange={(e) => setPlacement(e.target.value as PromotionPlacement)}
            >
              {PROMOTION_PLACEMENTS.map((p) => (
                <option key={p} value={p}>
                  {PROMOTION_PLACEMENT_LABELS[p]}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid gap-4 border-t border-ink-700 pt-5 sm:grid-cols-2">
          <StatusSelect id="prf-status" value={status} onChange={setStatus} />
          <Field label="Display order" htmlFor="prf-sort" hint="Lower numbers come first.">
            <Input
              id="prf-sort"
              type="number"
              min={0}
              value={sortOrder}
              onChange={(e) => setSortOrder(Number(e.target.value) || 0)}
            />
          </Field>
        </div>

        <div className="flex items-center gap-3 border-t border-ink-700 pt-5">
          <Button type="submit" disabled={busy}>
            {busy ? 'Saving…' : isEdit ? 'Save changes' : 'Create promotion'}
          </Button>
          <button type="button" onClick={onCancel} className="text-sm text-ink-400 hover:text-ink-200">
            Cancel
          </button>
        </div>
      </form>
    </Card>
  );
}
