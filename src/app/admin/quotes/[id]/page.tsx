import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Card, CardHeader, DefinitionList } from '@/components/ui';
import { QuoteStatusBadge } from '@/components/account/status-badge';
import { QuoteControls } from '@/components/admin/controls';
import { requireAdmin } from '@/lib/auth/session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { resolveBuild } from '@/lib/catalog/repository';
import { checkCompatibility } from '@/lib/compatibility/engine';
import { priceBuild } from '@/lib/pricing/pricing';
import { formatDateTime, formatMoney } from '@/lib/utils';
import { CATEGORY_LABELS, displayName } from '@/lib/catalog/types';
import type { Quote } from '@/types/domain';

export const metadata: Metadata = { title: 'Quote' };
export const dynamic = 'force-dynamic';

export default async function AdminQuotePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const supabase = await getSupabaseServerClient();

  const { data } = await supabase!.from('quotes').select('*').eq('id', id).maybeSingle();
  if (!data) notFound();
  const quote = data as Quote;

  // Re-resolved against today's catalogue: the estimate the customer saw may
  // predate a price change, and quoting from a stale number is how margin
  // disappears.
  const { build, missingIds } = await resolveBuild(quote.items);
  const report = checkCompatibility(build);
  const price = priceBuild(build, { province: quote.province });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/admin/quotes" className="text-sm text-ink-400 hover:text-ink-200">
            &larr; Quotes
          </Link>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">
            {quote.reference}
          </h1>
          <p className="text-sm text-ink-400">Received {formatDateTime(quote.created_at)}</p>
        </div>
        <QuoteStatusBadge status={quote.status} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="text-sm font-semibold tracking-wide text-white uppercase">Customer</h2>
            <DefinitionList
              className="mt-3"
              items={[
                { term: 'Name', value: quote.customer_name },
                { term: 'Email', value: quote.customer_email },
                { term: 'Phone', value: quote.customer_phone ?? '—' },
                { term: 'Prefers', value: quote.preferred_contact },
                { term: 'Province', value: quote.province ?? '—' },
              ]}
            />
            {quote.customer_notes ? (
              <div className="mt-4 border-t border-ink-700 pt-4">
                <p className="text-xs tracking-wide text-ink-400 uppercase">What they asked for</p>
                <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap text-ink-200">
                  {quote.customer_notes}
                </p>
              </div>
            ) : null}
          </Card>

          <Card>
            <CardHeader
              title="Attached configuration"
              description={
                build.length === 0
                  ? 'No configuration attached to this request.'
                  : `${build.length} parts, repriced against the current catalogue`
              }
            />
            {build.length > 0 ? (
              <>
                <ul className="divide-y divide-ink-700">
                  {build.map((item) => (
                    <li
                      key={item.component.id}
                      className="flex justify-between gap-4 px-5 py-2.5 text-sm"
                    >
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

                <div className="space-y-1 border-t border-ink-700 px-5 py-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-ink-400">Estimate when submitted</span>
                    <span className="tnum text-ink-300">
                      {formatMoney(quote.estimated_total_cents)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-200">Estimate today</span>
                    <span className="tnum font-medium text-white">
                      {formatMoney(price.totalCents)}
                    </span>
                  </div>
                  {report.failures.length > 0 ? (
                    <p className="pt-2 text-xs text-danger-400">
                      {report.failures.length} compatibility problem
                      {report.failures.length === 1 ? '' : 's'}: {report.failures[0].message}
                    </p>
                  ) : null}
                  {missingIds.length > 0 ? (
                    <p className="pt-2 text-xs text-warn-400">
                      {missingIds.length} part{missingIds.length === 1 ? ' is' : 's are'} no longer
                      in the catalogue.
                    </p>
                  ) : null}
                </div>
              </>
            ) : null}
          </Card>
        </div>

        <QuoteControls quote={quote} />
      </div>
    </div>
  );
}
