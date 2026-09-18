'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Alert, Badge, ButtonLink, Card, EmptyState } from '@/components/ui';
import { formatDate, formatMoney } from '@/lib/utils';
import type { SavedBuild } from '@/types/domain';

/**
 * Saved build management: open in the configurator, duplicate, rename, delete.
 * Duplication re-posts the parts list, so the copy's price and compatibility
 * are recalculated server-side rather than copied from a stale snapshot.
 */
export function SavedBuildList({ builds }: { builds: SavedBuild[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  if (builds.length === 0) {
    return (
      <EmptyState
        title="No saved builds"
        description="Configure a machine and save it. Saved builds are recalculated against current prices each time you open them."
        action={<ButtonLink href="/build">Open the configurator</ButtonLink>}
      />
    );
  }

  async function remove(id: string) {
    setBusyId(id);
    setError(null);
    const response = await fetch(`/api/builds/${id}`, { method: 'DELETE' });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error ?? 'Could not delete that build.');
      setBusyId(null);
      return;
    }
    setBusyId(null);
    setConfirmingId(null);
    router.refresh();
  }

  async function duplicate(build: SavedBuild) {
    setBusyId(build.id);
    setError(null);
    const response = await fetch('/api/builds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `${build.name} (copy)`.slice(0, 80),
        notes: build.notes,
        items: build.items,
      }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error ?? 'Could not duplicate that build.');
      setBusyId(null);
      return;
    }
    setBusyId(null);
    router.refresh();
  }

  async function rename(build: SavedBuild) {
    const next = window.prompt('New name for this build', build.name);
    if (!next || next === build.name) return;
    setBusyId(build.id);
    const response = await fetch(`/api/builds/${build.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: next.slice(0, 80) }),
    });
    if (!response.ok) setError('Could not rename that build.');
    setBusyId(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {error ? <Alert tone="danger">{error}</Alert> : null}

      {builds.map((build) => (
        <Card key={build.id} className="p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-lg font-semibold text-white">{build.name}</h2>
                {build.is_compatible ? (
                  <Badge tone="ok">Checks passed</Badge>
                ) : (
                  <Badge tone="warn">Needs review</Badge>
                )}
              </div>
              <p className="mt-1 text-sm text-ink-400">
                {build.items.length} parts · saved {formatDate(build.updated_at)}
              </p>
              {build.notes ? <p className="mt-2 text-sm text-ink-300">{build.notes}</p> : null}
            </div>

            <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
              <span className="tnum text-lg font-semibold text-white">
                {formatMoney(build.estimated_total_cents)}
              </span>
              <span className="text-xs text-ink-500">estimate when saved</span>

              <div className="mt-1 flex flex-wrap items-center gap-3 text-sm">
                <Link
                  href={`/build?build=${build.id}`}
                  className="font-medium text-maple-400 hover:text-maple-300"
                >
                  Open
                </Link>
                <button
                  type="button"
                  onClick={() => duplicate(build)}
                  disabled={busyId === build.id}
                  className="text-ink-300 hover:text-white disabled:opacity-50"
                >
                  Duplicate
                </button>
                <button
                  type="button"
                  onClick={() => rename(build)}
                  disabled={busyId === build.id}
                  className="text-ink-300 hover:text-white disabled:opacity-50"
                >
                  Rename
                </button>
                {confirmingId === build.id ? (
                  <span className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => remove(build.id)}
                      disabled={busyId === build.id}
                      className="font-medium text-danger-400 hover:text-danger-500"
                    >
                      Confirm delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingId(null)}
                      className="text-ink-400 hover:text-ink-200"
                    >
                      Cancel
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmingId(build.id)}
                    className="text-ink-400 hover:text-danger-400"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
