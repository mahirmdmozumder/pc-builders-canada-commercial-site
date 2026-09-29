'use client';

import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, Input, Select, TableWrap } from '@/components/ui';
import { NoticeBar, type Notice } from '@/components/admin/content-controls';
import type { ContentStatus } from '@/lib/cms/types';

/**
 * The shell every content collection screen sits in.
 *
 * Five screens need the same frame: a heading with a count, an add button that
 * opens an inline form, a search box, a status filter, a table, and one place
 * where save results turn into a message. Building that once is what makes
 * Services, Portfolio and Promotions feel like the same admin rather than
 * three that were written on different days.
 *
 * Each screen supplies its own row renderer and its own form. Everything about
 * talking to the API — the busy flag, the error handling, the refresh — lives
 * here.
 */

export interface CollectionApi {
  busy: boolean;
  notice: Notice;
  /** POST to the collection. Returns true when it saved. */
  create: (values: unknown, label: string) => Promise<boolean>;
  /** PATCH one record. */
  update: (id: string, values: unknown, label: string) => Promise<boolean>;
  /** DELETE one record, which archives it. */
  archive: (id: string, label: string) => Promise<boolean>;
  notify: (notice: Notice) => void;
}

export function useCollectionApi(endpoint: string): CollectionApi {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [, setTick] = useState(0);
  const [notice, setNotice] = useState<Notice>(null);

  const run = useCallback(
    async (url: string, method: string, body: unknown, success: string) => {
      setBusy(true);
      try {
        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: body === undefined ? undefined : JSON.stringify(body),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          // Field errors come back keyed by field; the first one is the most
          // useful thing to put in front of somebody.
          const fieldError = data.fields ? Object.values(data.fields)[0] : null;
          throw new Error(String(fieldError ?? data.error ?? 'That did not save.'));
        }
        setNotice({ tone: 'ok', text: success });
        router.refresh();
        return true;
      } catch (err) {
        setNotice({
          tone: 'danger',
          text: err instanceof Error ? err.message : 'Something went wrong.',
        });
        return false;
      } finally {
        setBusy(false);
        setTick((t) => t + 1);
      }
    },
    [router],
  );

  return useMemo(
    () => ({
      busy,
      notice,
      notify: setNotice,
      create: (values: unknown, label: string) => run(endpoint, 'POST', values, `Created ${label}.`),
      update: (id: string, values: unknown, label: string) =>
        run(`${endpoint}/${id}`, 'PATCH', values, `Saved ${label}.`),
      archive: (id: string, label: string) =>
        run(`${endpoint}/${id}`, 'DELETE', undefined, `Archived ${label}.`),
    }),
    // `notice` is part of the identity on purpose, so the bar re-renders.
    [busy, notice, endpoint, run],
  );
}

export function CollectionShell<T extends { status?: ContentStatus }>({
  title,
  description,
  addLabel,
  items,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  headers,
  renderRow,
  form,
  creating,
  onCreatingChange,
  notice,
  onDismissNotice,
  emptyMessage,
  toolbar,
}: {
  title: string;
  description: ReactNode;
  addLabel: string;
  items: T[];
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: 'all' | ContentStatus;
  onStatusFilterChange: (value: 'all' | ContentStatus) => void;
  headers: { label: string; align?: 'right' }[];
  renderRow: (item: T) => ReactNode;
  form: ReactNode;
  creating: boolean;
  onCreatingChange: (value: boolean) => void;
  notice: Notice;
  onDismissNotice: () => void;
  emptyMessage: string;
  toolbar?: ReactNode;
}) {
  return (
    <div className="space-y-5">
      <NoticeBar notice={notice} onDismiss={onDismissNotice} />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-white">{title}</h1>
          <p className="mt-1 max-w-2xl text-sm text-ink-400">{description}</p>
        </div>
        <Button onClick={() => onCreatingChange(!creating)}>
          {creating ? 'Cancel' : addLabel}
        </Button>
      </div>

      {form}

      <Card className="overflow-hidden">
        <div className="grid gap-3 border-b border-ink-700 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,12rem)] lg:grid-cols-[minmax(0,1fr)_minmax(0,12rem)_auto]">
          <Input
            aria-label={`Search ${title.toLowerCase()}`}
            placeholder="Search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          <Select
            aria-label="Filter by status"
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value as 'all' | ContentStatus)}
          >
            <option value="all">Any status</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </Select>
          {toolbar}
        </div>

        <TableWrap>
          <table className="w-full min-w-[48rem] text-sm">
            <thead className="border-b border-ink-700 text-left text-xs tracking-wide text-ink-400 uppercase">
              <tr>
                {headers.map((header) => (
                  <th
                    key={header.label}
                    className={`px-4 py-3 font-medium ${header.align === 'right' ? 'text-right' : ''}`}
                  >
                    {header.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-700">
              {items.map((item) => renderRow(item))}
              {items.length === 0 ? (
                <tr>
                  <td colSpan={headers.length} className="px-4 py-10 text-center text-sm text-ink-400">
                    {emptyMessage}
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

/** Row actions shared by every collection: publish toggle and archive. */
export function RowActions({
  status,
  busy,
  onEdit,
  onPublish,
  onUnpublish,
  onArchive,
  extra,
}: {
  status: ContentStatus;
  busy: boolean;
  onEdit: () => void;
  onPublish: () => void;
  onUnpublish: () => void;
  onArchive: () => void;
  extra?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1 text-xs">
      <button type="button" onClick={onEdit} className="text-gold-400 hover:text-gold-300">
        Edit
      </button>
      {extra}
      {status === 'published' ? (
        <button
          type="button"
          disabled={busy}
          onClick={onUnpublish}
          className="text-ink-400 hover:text-white disabled:opacity-40"
        >
          Unpublish
        </button>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={onPublish}
          className="text-ok-400 hover:text-ok-500 disabled:opacity-40"
        >
          Publish
        </button>
      )}
      {status !== 'archived' ? (
        <button
          type="button"
          disabled={busy}
          onClick={onArchive}
          className="text-ink-400 hover:text-danger-400 disabled:opacity-40"
        >
          Archive
        </button>
      ) : null}
    </div>
  );
}
