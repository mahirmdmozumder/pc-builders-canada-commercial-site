'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge, Button, Card, Field, Input, TableWrap, Textarea } from '@/components/ui';
import { CONFIGURATOR_CATEGORIES } from '@/lib/catalog/types';
import type { CategoryMeta } from '@/lib/cms/types';
import { NoticeBar, type Notice } from '@/components/admin/content-controls';
import { ImageUpload } from '@/components/admin/image-upload';

/**
 * Category presentation.
 *
 * What is editable here is how a category LOOKS: its label, its description,
 * its image, where it sits in a list, and whether it is shown at all.
 *
 * What is not editable is the set of categories. They are enum values that the
 * compatibility engine switches on, and a category the engine has no rules for
 * is one it cannot check — so adding or removing one is a migration where the
 * rules get written at the same time. Migration 0005 explains the reasoning
 * at length.
 *
 * Hiding a category with the Shown toggle is the safe way to retire a line:
 * it disappears from storefront listings without touching a single product,
 * and nothing that an order references is affected.
 */
export function CategoriesManager({ categories }: { categories: CategoryMeta[] }) {
  const router = useRouter();
  const [notice, setNotice] = useState<Notice>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  async function save(category: string, values: Record<string, unknown>, label: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/categories/${category}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'That did not save.');
      setNotice({ tone: 'ok', text: `Saved ${label}.` });
      setEditing(null);
      router.refresh();
    } catch (err) {
      setNotice({ tone: 'danger', text: err instanceof Error ? err.message : 'Something failed.' });
    } finally {
      setBusy(false);
    }
  }

  const editingRecord = editing ? categories.find((c) => c.category === editing) : null;

  return (
    <div className="space-y-5">
      <NoticeBar notice={notice} onDismiss={() => setNotice(null)} />

      <div>
        <h1 className="text-xl font-semibold text-white">Categories</h1>
        <p className="mt-1 max-w-3xl text-sm text-ink-400">
          Rename, describe, reorder and hide categories. The set of categories itself is fixed in
          code, because the compatibility engine has to have rules written for each one — see the
          note below.
        </p>
      </div>

      {editingRecord ? (
        <CategoryForm
          key={editingRecord.category}
          record={editingRecord}
          busy={busy}
          onCancel={() => setEditing(null)}
          onSubmit={(values) => save(editingRecord.category, values, editingRecord.label)}
        />
      ) : null}

      <Card className="overflow-hidden">
        <TableWrap>
          <table className="w-full min-w-[42rem] text-sm">
            <thead className="border-b border-ink-700 text-left text-xs tracking-wide text-ink-400 uppercase">
              <tr>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Key</th>
                <th className="px-4 py-3 font-medium">In configurator</th>
                <th className="px-4 py-3 text-right font-medium">Order</th>
                <th className="px-4 py-3 font-medium">Shown</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-700">
              {categories.map((category) => {
                const inConfigurator = CONFIGURATOR_CATEGORIES.includes(category.category);
                return (
                  <tr key={category.category} className={category.active ? '' : 'opacity-60'}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="size-8 shrink-0 overflow-hidden rounded border border-ink-700 bg-ink-900">
                          {category.image_url ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={category.image_url} alt="" className="size-full object-cover" />
                          ) : null}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-white">{category.label}</p>
                          {category.description ? (
                            <p className="max-w-sm truncate text-xs text-ink-400">
                              {category.description}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-ink-500">{category.category}</td>
                    <td className="px-4 py-3 text-xs">
                      {inConfigurator ? (
                        <span className="text-ok-400">Yes</span>
                      ) : (
                        <span className="text-ink-500">Sold as a unit</span>
                      )}
                    </td>
                    <td className="tnum px-4 py-3 text-right text-ink-400">{category.sort_order}</td>
                    <td className="px-4 py-3">
                      <Badge tone={category.active ? 'ok' : 'neutral'}>
                        {category.active ? 'Shown' : 'Hidden'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-3 text-xs">
                        <button
                          type="button"
                          onClick={() => setEditing(category.category)}
                          className="text-gold-400 hover:text-gold-300"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            save(category.category, { active: !category.active }, category.label)
                          }
                          className="text-ink-400 hover:text-white disabled:opacity-40"
                        >
                          {category.active ? 'Hide' : 'Show'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableWrap>
      </Card>

      <Card className="p-5">
        <h2 className="text-sm font-semibold tracking-wide text-white uppercase">
          Why you cannot add a category here
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink-300">
          Every category is something the compatibility engine reasons about. When it checks
          whether a cooler fits a processor, or whether a graphics card fits a case, it is
          switching on the category to decide which rule applies. A category created from a form
          would have no rules, so the engine would have nothing to say about it — and the
          configurator would quietly report &ldquo;unknown&rdquo; while looking like it had
          checked.
        </p>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink-300">
          So adding a category is a code change, where the rules get written at the same time.
          Tell me what you want to sell and it is a small job. Everything about how a category
          appears is editable right here.
        </p>
      </Card>
    </div>
  );
}

function CategoryForm({
  record,
  busy,
  onSubmit,
  onCancel,
}: {
  record: CategoryMeta;
  busy: boolean;
  onSubmit: (values: Record<string, unknown>) => void;
  onCancel: () => void;
}) {
  const [label, setLabel] = useState(record.label);
  const [description, setDescription] = useState(record.description ?? '');
  const [imageUrl, setImageUrl] = useState<string | null>(record.image_url);
  const [sortOrder, setSortOrder] = useState(record.sort_order);
  const [active, setActive] = useState(record.active);
  const [seoTitle, setSeoTitle] = useState(record.seo_title ?? '');
  const [seoDescription, setSeoDescription] = useState(record.seo_description ?? '');

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">{record.label}</h2>
          <p className="font-mono text-xs text-ink-500">{record.category}</p>
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
            label: label.trim(),
            description: description.trim() || null,
            image_url: imageUrl,
            sort_order: Number(sortOrder),
            active,
            seo_title: seoTitle.trim() || null,
            seo_description: seoDescription.trim() || null,
          });
        }}
      >
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,10rem)]">
          <Field label="Label" htmlFor="cgf-label" required hint="What customers see.">
            <Input id="cgf-label" value={label} required onChange={(e) => setLabel(e.target.value)} />
          </Field>
          <Field label="Display order" htmlFor="cgf-sort">
            <Input
              id="cgf-sort"
              type="number"
              min={0}
              value={sortOrder}
              onChange={(e) => setSortOrder(Number(e.target.value) || 0)}
            />
          </Field>
        </div>

        <Field label="Description" htmlFor="cgf-description">
          <Textarea
            id="cgf-description"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>

        <ImageUpload value={imageUrl} onChange={setImageUrl} folder="categories" label="Category image" />

        <label className="flex items-start gap-2 text-sm text-ink-300">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="mt-0.5 size-4 rounded border-ink-600 bg-ink-900 accent-gold-500"
          />
          <span>
            Show this category
            <span className="block text-xs text-ink-400">
              Hiding it removes the category from storefront listings. Products in it are
              untouched, and anything already ordered is unaffected.
            </span>
          </span>
        </label>

        <div className="grid gap-4 border-t border-ink-700 pt-5 sm:grid-cols-2">
          <Field label="SEO title" htmlFor="cgf-seo-title">
            <Input id="cgf-seo-title" value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} />
          </Field>
          <Field label="Meta description" htmlFor="cgf-seo-description">
            <Input
              id="cgf-seo-description"
              value={seoDescription}
              onChange={(e) => setSeoDescription(e.target.value)}
            />
          </Field>
        </div>

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
