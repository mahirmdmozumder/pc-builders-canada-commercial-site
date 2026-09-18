'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Alert, Button, Card, Field, Input, Select, Textarea } from '@/components/ui';
import { formatMoney } from '@/lib/utils';
import { useHydrated } from '@/lib/hooks/use-hydrated';
import { PROVINCE_OPTIONS } from '@/lib/pricing/tax';
import { priceBuild } from '@/lib/pricing/pricing';
import { checkCompatibility } from '@/lib/compatibility/engine';
import {
  CATEGORY_LABELS,
  displayName,
  type PublicComponent,
  type ResolvedBuild,
} from '@/lib/catalog/types';
import type { SavedBuildItem } from '@/types/domain';

const DRAFT_KEY = 'pcbc-builder-draft-v1';

interface SubmitState {
  status: 'idle' | 'submitting' | 'done' | 'error';
  reference?: string;
  emailSent?: boolean;
  message?: string;
  fields?: Record<string, string>;
}

interface Draft {
  items?: SavedBuildItem[];
  name?: string;
  province?: string;
}

function readDraft(): Draft | null {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw) as Draft;
    return Array.isArray(draft.items) && draft.items.length > 0 ? draft : null;
  } catch {
    // Ignore a corrupt or unavailable draft; the form works without one.
    return null;
  }
}

/**
 * The configuration to attach comes from the builder draft in localStorage,
 * so the form is mounted only after hydration and seeds its state directly
 * rather than patching it in an effect.
 */
export function QuoteForm({ catalogue }: { catalogue: PublicComponent[] }) {
  const hydrated = useHydrated();
  if (!hydrated) {
    return (
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="h-[36rem] animate-pulse rounded-lg border border-ink-700 bg-ink-850" />
        <div className="h-64 animate-pulse rounded-lg border border-ink-700 bg-ink-850" />
      </div>
    );
  }
  return <QuoteFormInner catalogue={catalogue} />;
}

function QuoteFormInner({ catalogue }: { catalogue: PublicComponent[] }) {
  const byId = useMemo(() => new Map(catalogue.map((c) => [c.id, c])), [catalogue]);

  const [draft] = useState(readDraft);
  const [items] = useState<SavedBuildItem[]>(draft?.items ?? []);
  const [buildName] = useState(draft?.name ?? 'Custom build');
  const [province, setProvince] = useState(draft?.province ?? 'ON');
  const [attachBuild, setAttachBuild] = useState(true);
  const [state, setState] = useState<SubmitState>({ status: 'idle' });

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

  const price = useMemo(() => priceBuild(build, { province }), [build, province]);
  const report = useMemo(() => checkCompatibility(build), [build]);
  const hasBuild = attachBuild && build.length > 0;

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setState({ status: 'submitting' });

    const body = {
      customer_name: String(form.get('customer_name') ?? ''),
      customer_email: String(form.get('customer_email') ?? ''),
      customer_phone: String(form.get('customer_phone') ?? '') || null,
      preferred_contact: String(form.get('preferred_contact') ?? 'email') as 'email' | 'phone',
      province,
      build_name: hasBuild ? buildName || 'Custom build' : null,
      items: hasBuild ? items : [],
      customer_notes: String(form.get('customer_notes') ?? '') || null,
    };

    try {
      const response = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const payload = await response.json();

      if (!response.ok) {
        setState({
          status: 'error',
          message: payload.error ?? 'Could not submit your request.',
          fields: payload.fields,
        });
        return;
      }

      setState({
        status: 'done',
        reference: payload.reference,
        emailSent: payload.confirmation_email_sent,
      });
    } catch {
      setState({
        status: 'error',
        message: 'Could not reach the server. Check your connection and try again.',
      });
    }
  }

  if (state.status === 'done') {
    return (
      <Card className="mx-auto max-w-2xl p-8 text-center">
        <p className="text-xs tracking-[0.18em] text-maple-400 uppercase">Request received</p>
        <h2 className="mt-3 text-2xl font-semibold text-white">
          Your reference is {state.reference}
        </h2>
        <p className="mx-auto mt-4 max-w-md text-ink-300">
          A person reviews every request. Expect a reply with a parts list and the reasoning behind
          any changes we suggest.
        </p>
        {state.emailSent === false ? (
          <p className="mx-auto mt-4 max-w-md text-sm text-warn-400">
            Note: email delivery is not configured on this deployment, so no confirmation message
            was sent. Keep your reference number.
          </p>
        ) : null}
        <div className="mt-8">
          <Link href="/build" className="text-sm text-maple-400 hover:text-maple-300">
            Back to the configurator
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
      <Card className="p-6">
        <form onSubmit={onSubmit} className="space-y-5" noValidate>
          {state.status === 'error' && state.message ? (
            <Alert tone="danger" title="Could not submit">
              {state.message}
            </Alert>
          ) : null}

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Name" htmlFor="customer_name" required error={state.fields?.customer_name}>
              <Input id="customer_name" name="customer_name" autoComplete="name" required />
            </Field>
            <Field
              label="Email"
              htmlFor="customer_email"
              required
              error={state.fields?.customer_email}
            >
              <Input
                id="customer_email"
                name="customer_email"
                type="email"
                autoComplete="email"
                required
              />
            </Field>
            <Field label="Phone" htmlFor="customer_phone" error={state.fields?.customer_phone} hint="Optional unless you prefer a call">
              <Input id="customer_phone" name="customer_phone" type="tel" autoComplete="tel" />
            </Field>
            <Field label="Preferred contact" htmlFor="preferred_contact">
              <Select id="preferred_contact" name="preferred_contact" defaultValue="email">
                <option value="email">Email</option>
                <option value="phone">Phone</option>
              </Select>
            </Field>
          </div>

          <Field label="Province" htmlFor="quote-province" hint="Used for the tax estimate only">
            <Select
              id="quote-province"
              value={province}
              onChange={(e) => setProvince(e.target.value)}
            >
              {PROVINCE_OPTIONS.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="What is this machine for?"
            htmlFor="customer_notes"
            error={state.fields?.customer_notes}
            hint="Budget, the games or software you use, anything you already own, and any constraints on size or noise."
          >
            <Textarea
              id="customer_notes"
              name="customer_notes"
              rows={6}
              placeholder="Example: mostly Unreal Engine and Blender, some 1440p gaming. Budget around $3,000. I already have a monitor and peripherals."
            />
          </Field>

          <div className="flex items-center justify-between border-t border-ink-700 pt-5">
            <p className="text-xs text-ink-400">
              We reply to quotes by hand, usually within one business day.
            </p>
            <Button type="submit" disabled={state.status === 'submitting'}>
              {state.status === 'submitting' ? 'Sending...' : 'Send request'}
            </Button>
          </div>
        </form>
      </Card>

      <Card className="overflow-hidden lg:sticky lg:top-20">
        <div className="border-b border-ink-700 px-5 py-4">
          <h2 className="text-sm font-semibold tracking-wide text-white uppercase">
            Attached configuration
          </h2>
        </div>

        {build.length === 0 ? (
          <div className="px-5 py-6">
            <p className="text-sm text-ink-300">
              No configuration attached. Describe what you need in the form, or build one first and
              it will be attached automatically.
            </p>
            <Link
              href="/build"
              className="mt-3 inline-block text-sm font-medium text-maple-400 hover:text-maple-300"
            >
              Open the configurator &rarr;
            </Link>
          </div>
        ) : (
          <>
            <label className="flex items-center gap-2 border-b border-ink-700 px-5 py-3 text-sm text-ink-200">
              <input
                type="checkbox"
                checked={attachBuild}
                onChange={(e) => setAttachBuild(e.target.checked)}
                className="size-4 rounded border-ink-600 bg-ink-900 accent-maple-500"
              />
              Attach this configuration
            </label>

            <ul className="divide-y divide-ink-700">
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
                  <span className="tnum shrink-0 text-ink-300">
                    {formatMoney(item.component.price_cents * item.quantity)}
                  </span>
                </li>
              ))}
            </ul>

            <div className="border-t border-ink-700 px-5 py-4">
              <div className="flex justify-between text-sm">
                <span className="text-ink-300">Estimated total</span>
                <span className="tnum font-semibold text-white">
                  {formatMoney(price.totalCents)}
                </span>
              </div>
              <p className="mt-1 text-xs text-ink-500">
                Includes assembly, shipping and {province} tax. Estimate only.
              </p>
              {report.failures.length > 0 ? (
                <p className="mt-3 text-xs text-warn-400">
                  This configuration has {report.failures.length} compatibility{' '}
                  {report.failures.length === 1 ? 'problem' : 'problems'}. Send it anyway and we
                  will suggest fixes.
                </p>
              ) : null}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
