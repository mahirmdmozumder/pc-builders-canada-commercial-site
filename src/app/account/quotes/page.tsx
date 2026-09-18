import type { Metadata } from 'next';
import { ButtonLink, Card, EmptyState } from '@/components/ui';
import { QuoteStatusBadge } from '@/components/account/status-badge';
import { requireUser } from '@/lib/auth/session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { formatDate, formatMoney } from '@/lib/utils';
import type { Quote } from '@/types/domain';

export const metadata: Metadata = {
  title: 'Your quotes',
  robots: { index: false, follow: false },
};

export default async function QuotesPage() {
  await requireUser('/account/quotes');
  const supabase = await getSupabaseServerClient();

  // `internal_notes` is deliberately absent from this select: staff notes are
  // never sent to a customer-facing page, on top of what RLS allows.
  const { data } = await supabase!
    .from('quotes')
    .select('id, reference, build_name, status, estimated_total_cents, quoted_total_cents, created_at, customer_notes')
    .order('created_at', { ascending: false });

  const quotes = (data ?? []) as Pick<
    Quote,
    | 'id'
    | 'reference'
    | 'build_name'
    | 'status'
    | 'estimated_total_cents'
    | 'quoted_total_cents'
    | 'created_at'
    | 'customer_notes'
  >[];

  if (quotes.length === 0) {
    return (
      <EmptyState
        title="No quotes yet"
        description="Send us a configuration or a description of what you need, and the conversation will be tracked here."
        action={<ButtonLink href="/quote">Request a quote</ButtonLink>}
      />
    );
  }

  return (
    <div className="space-y-4">
      {quotes.map((quote) => (
        <Card key={quote.id} className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-semibold text-white">{quote.reference}</h2>
                <QuoteStatusBadge status={quote.status} />
              </div>
              <p className="mt-1 text-sm text-ink-400">
                {quote.build_name ?? 'Description only'} · {formatDate(quote.created_at)}
              </p>
              {quote.customer_notes ? (
                <p className="mt-3 line-clamp-3 text-sm text-ink-300">{quote.customer_notes}</p>
              ) : null}
            </div>
            <div className="text-right">
              {quote.quoted_total_cents !== null ? (
                <>
                  <p className="tnum text-lg font-semibold text-white">
                    {formatMoney(quote.quoted_total_cents)}
                  </p>
                  <p className="text-xs text-ink-500">quoted</p>
                </>
              ) : (
                <>
                  <p className="tnum text-lg font-semibold text-ink-200">
                    {formatMoney(quote.estimated_total_cents)}
                  </p>
                  <p className="text-xs text-ink-500">your estimate</p>
                </>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
