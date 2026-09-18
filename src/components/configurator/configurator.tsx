'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Button, Card } from '@/components/ui';
import { CategoryPicker, SelectedRow, type CandidateIssue } from '@/components/configurator/category-picker';
import {
  CompatibilityPanel,
  PowerPanel,
  PricePanel,
} from '@/components/configurator/build-summary';
import { checkCompatibility } from '@/lib/compatibility/engine';
import { priceBuild } from '@/lib/pricing/pricing';
import { useCart } from '@/lib/cart/store';
import { useClientSession } from '@/lib/auth/use-session';
import { useHydrated } from '@/lib/hooks/use-hydrated';
import { cn, formatMoney } from '@/lib/utils';
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  REQUIRED_CATEGORIES,
  displayName,
  type ComponentCategory,
  type PublicComponent,
  type ResolvedBuild,
} from '@/lib/catalog/types';
import type { SavedBuildItem } from '@/types/domain';

/** Categories where more than one distinct part can be added. */
const MULTI_SELECT: ComponentCategory[] = ['storage', 'accessory'];
/** Categories where a quantity control makes sense. */
const QUANTITY_ALLOWED: ComponentCategory[] = ['ram', 'storage', 'accessory'];

const DRAFT_KEY = 'pcbc-builder-draft-v1';

interface Draft {
  items: SavedBuildItem[];
  province: string;
  name: string;
}

interface ConfiguratorProps {
  catalogue: PublicComponent[];
  initialItems: SavedBuildItem[];
  initialName: string;
  /** True when the catalogue is the in-repo sample set, not a live database. */
  sampleData: boolean;
}

function readDraft(): Draft | null {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw) as Draft;
    return Array.isArray(draft.items) && draft.items.length > 0 ? draft : null;
  } catch {
    // A corrupt or unavailable store is not worth failing the page over.
    return null;
  }
}

/**
 * Hydration boundary.
 *
 * The saved draft lives in localStorage, which the server cannot read. Rather
 * than render empty and then patch state in an effect (two renders, and a
 * flash of the wrong build), the inner component is mounted only on the
 * client and seeds its state directly from the draft.
 */
export function Configurator(props: ConfiguratorProps) {
  const hydrated = useHydrated();
  if (!hydrated) return <ConfiguratorSkeleton />;
  return <ConfiguratorInner {...props} />;
}

function ConfiguratorSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="h-[32rem] animate-pulse rounded-lg border border-ink-700 bg-ink-850" />
      <div className="h-96 animate-pulse rounded-lg border border-ink-700 bg-ink-850" />
    </div>
  );
}

function ConfiguratorInner({ catalogue, initialItems, initialName, sampleData }: ConfiguratorProps) {
  const router = useRouter();
  const { signedIn } = useClientSession();
  const addBuild = useCart((s) => s.addBuild);

  // A preset or saved build passed in by the server wins over the local draft.
  const [draft] = useState(() => (initialItems.length > 0 ? null : readDraft()));

  const [items, setItems] = useState<SavedBuildItem[]>(draft?.items ?? initialItems);
  const [province, setProvince] = useState(draft?.province || 'ON');
  const [name, setName] = useState(draft?.name || initialName);
  const [openCategory, setOpenCategory] = useState<ComponentCategory | null>(
    (draft?.items ?? initialItems).length === 0 ? 'cpu' : null,
  );
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const byId = useMemo(() => new Map(catalogue.map((c) => [c.id, c])), [catalogue]);
  const byCategory = useMemo(() => {
    const map = new Map<ComponentCategory, PublicComponent[]>();
    for (const component of catalogue) {
      const list = map.get(component.category) ?? [];
      list.push(component);
      map.set(component.category, list);
    }
    return map;
  }, [catalogue]);

  // Persist the working draft so a refresh, or a detour to the quote form,
  // does not lose the configuration.
  useEffect(() => {
    try {
      window.localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({ items, province, name } satisfies Draft),
      );
    } catch {
      // Storage can be unavailable (private mode, quota). Not fatal.
    }
  }, [items, province, name]);

  const build: ResolvedBuild = useMemo(
    () =>
      items.flatMap((item) => {
        const component = byId.get(item.component_id);
        return component
          ? [{ category: component.category, component, quantity: item.quantity }]
          : [];
      }),
    [items, byId],
  );

  const report = useMemo(() => checkCompatibility(build), [build]);
  const price = useMemo(() => priceBuild(build, { province }), [build, province]);

  /**
   * For the open category, run the engine once per candidate with that part
   * swapped in. This is what lets the picker say "this card is too long for
   * your case" before the customer selects it.
   */
  const candidateIssues = useMemo(() => {
    const map = new Map<string, CandidateIssue>();
    if (!openCategory) return map;
    const options = byCategory.get(openCategory) ?? [];
    const others = build.filter(
      (b) => b.category !== openCategory || MULTI_SELECT.includes(openCategory),
    );

    for (const option of options) {
      const hypothetical = [...others, { category: option.category, component: option, quantity: 1 }];
      const result = checkCompatibility(hypothetical);
      const failure = result.failures[0];
      if (failure) {
        map.set(option.id, { severity: 'fail', message: failure.message });
        continue;
      }
      const warning = result.warnings[0];
      if (warning) map.set(option.id, { severity: 'warning', message: warning.message });
    }
    return map;
  }, [openCategory, byCategory, build]);

  const select = useCallback(
    (component: PublicComponent) => {
      setItems((current) => {
        const multi = MULTI_SELECT.includes(component.category);
        const withoutCategory = multi
          ? current.filter((i) => i.component_id !== component.id)
          : current.filter((i) => i.category !== component.category);
        return [
          ...withoutCategory,
          { category: component.category, component_id: component.id, quantity: 1 },
        ];
      });
      if (!MULTI_SELECT.includes(component.category)) setOpenCategory(null);
      setSaveState('idle');
    },
    [],
  );

  const removeItem = useCallback((componentId: string) => {
    setItems((current) => current.filter((i) => i.component_id !== componentId));
    setSaveState('idle');
  }, []);

  const setQuantity = useCallback((componentId: string, quantity: number) => {
    setItems((current) =>
      current.map((i) => (i.component_id === componentId ? { ...i, quantity } : i)),
    );
  }, []);

  const reset = useCallback(() => {
    setItems([]);
    setOpenCategory('cpu');
    setSaveState('idle');
  }, []);

  const blocking = report.failures.length > 0;
  const incomplete = report.missingCategories.length > 0;

  async function saveBuild() {
    setSaveState('saving');
    setSaveMessage(null);
    try {
      const response = await fetch('/api/builds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, items, notes: null }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setSaveState('error');
        setSaveMessage(payload.error ?? 'Could not save this build.');
        return;
      }
      setSaveState('saved');
      setSaveMessage('Saved to your account.');
    } catch {
      setSaveState('error');
      setSaveMessage('Could not reach the server. Check your connection and try again.');
    }
  }

  function addToCart() {
    addBuild({
      name: name || 'Custom build',
      items,
      quantity: 1,
      snapshotPriceCents: price.subtotalCents,
      includesOs: build.some((b) => b.category === 'os' && b.component.price_cents > 0),
    });
    router.push('/cart');
  }

  function requestQuote() {
    router.push('/quote?source=builder');
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
      <div className="space-y-4">
        {sampleData ? (
          <Alert tone="info" title="Sample catalogue">
            This deployment is running on the in-repo development catalogue. Part specifications
            here have not been verified against manufacturer documentation, and stock levels are
            placeholders. Connect a database to use live inventory.
          </Alert>
        ) : null}

        <Card className="overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-ink-700 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
              <label htmlFor="build-name" className="block text-xs text-ink-400">
                Build name
              </label>
              <input
                id="build-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
                className="w-full border-0 bg-transparent p-0 text-lg font-semibold text-white focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={reset}
              className="self-start rounded-md border border-ink-600 px-3 py-1.5 text-xs text-ink-300 hover:text-white sm:self-auto"
            >
              Start over
            </button>
          </div>

          <ul className="divide-y divide-ink-700">
            {CATEGORY_ORDER.map((category) => {
              const selectedItems = items.filter((i) => i.category === category);
              const isOpen = openCategory === category;
              const required = REQUIRED_CATEGORIES.includes(category);

              return (
                <li key={category}>
                  {selectedItems.length === 0 ? (
                    <SelectedRow
                      category={category}
                      component={null}
                      quantity={1}
                      allowQuantity={false}
                      onOpen={() => setOpenCategory(isOpen ? null : category)}
                      onRemove={() => {}}
                      onQuantity={() => {}}
                    />
                  ) : (
                    selectedItems.map((item) => {
                      const component = byId.get(item.component_id);
                      if (!component) return null;
                      return (
                        <SelectedRow
                          key={item.component_id}
                          category={category}
                          component={component}
                          quantity={item.quantity}
                          allowQuantity={QUANTITY_ALLOWED.includes(category)}
                          onOpen={() => setOpenCategory(isOpen ? null : category)}
                          onRemove={() => removeItem(item.component_id)}
                          onQuantity={(qty) => setQuantity(item.component_id, qty)}
                        />
                      );
                    })
                  )}

                  {selectedItems.length > 0 && MULTI_SELECT.includes(category) && !isOpen ? (
                    <div className="px-4 pb-3">
                      <button
                        type="button"
                        onClick={() => setOpenCategory(category)}
                        className="text-xs font-medium text-maple-400 hover:text-maple-300"
                      >
                        + Add another {CATEGORY_LABELS[category].toLowerCase()}
                      </button>
                    </div>
                  ) : null}

                  {!required && selectedItems.length === 0 && !isOpen ? null : null}

                  {isOpen ? (
                    <CategoryPicker
                      category={category}
                      options={byCategory.get(category) ?? []}
                      selectedIds={selectedItems.map((i) => i.component_id)}
                      issues={candidateIssues}
                      onSelect={select}
                      onClose={() => setOpenCategory(null)}
                    />
                  ) : null}
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

      {/* Summary: sticky on desktop, ordinary flow on mobile so it does not
          cover the list while choosing parts. */}
      <div className="lg:sticky lg:top-20">
        <Card className="overflow-hidden">
          <div className="px-5 py-4">
            <div className="flex items-baseline justify-between">
              <h2 className="text-sm font-semibold tracking-wide text-white uppercase">
                Your build
              </h2>
              <span className="tnum text-sm text-ink-300">
                {build.length} {build.length === 1 ? 'part' : 'parts'}
              </span>
            </div>
            {incomplete ? (
              <p className="mt-2 text-xs text-ink-400">
                Still needed:{' '}
                {report.missingCategories.map((c) => CATEGORY_LABELS[c]).join(', ')}
              </p>
            ) : null}
          </div>

          <PricePanel price={price} province={province} onProvinceChange={setProvince} />
          <CompatibilityPanel report={report} />
          <PowerPanel report={report} />

          <div className="space-y-2 border-t border-ink-700 px-5 py-4">
            {blocking ? (
              <p className="text-xs text-danger-400">
                Resolve the compatibility problems above before adding this build to your cart.
              </p>
            ) : null}

            <Button
              onClick={addToCart}
              disabled={blocking || incomplete}
              className="w-full"
              size="lg"
            >
              Add to cart &mdash; {formatMoney(price.totalCents)}
            </Button>

            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" onClick={requestQuote} disabled={build.length === 0}>
                Request a quote
              </Button>
              <Button
                variant="secondary"
                onClick={signedIn ? saveBuild : () => router.push('/login?next=%2Fbuild')}
                disabled={build.length === 0 || saveState === 'saving'}
              >
                {saveState === 'saving' ? 'Saving...' : signedIn ? 'Save build' : 'Sign in to save'}
              </Button>
            </div>

            {saveMessage ? (
              <p
                className={cn(
                  'text-xs',
                  saveState === 'error' ? 'text-danger-400' : 'text-ok-400',
                )}
                role="status"
              >
                {saveMessage}
              </p>
            ) : null}

            <p className="pt-1 text-xs leading-relaxed text-ink-500">
              Totals are an estimate. Parts, assembly, shipping and tax are confirmed at checkout.
            </p>
          </div>
        </Card>

        {build.length > 0 ? (
          <details className="mt-4 rounded-lg border border-ink-700 bg-ink-850">
            <summary className="cursor-pointer px-5 py-3 text-sm font-medium text-ink-200">
              Parts list
            </summary>
            <ul className="divide-y divide-ink-700 border-t border-ink-700">
              {build.map((item) => (
                <li key={item.component.id} className="flex justify-between gap-4 px-5 py-2.5 text-sm">
                  <span className="min-w-0">
                    <span className="block text-xs text-ink-400">
                      {CATEGORY_LABELS[item.category]}
                    </span>
                    <span className="block truncate text-ink-100">
                      {displayName(item.component)}
                      {item.quantity > 1 ? ` x${item.quantity}` : ''}
                    </span>
                  </span>
                  <span className="tnum shrink-0 text-ink-200">
                    {formatMoney(item.component.price_cents * item.quantity)}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </div>
    </div>
  );
}
