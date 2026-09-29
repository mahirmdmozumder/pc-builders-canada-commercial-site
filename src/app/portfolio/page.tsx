import type { Metadata } from 'next';
import { ButtonLink, Card, EmptyState, PageHeader, PageShell } from '@/components/ui';
import { listPublishedPortfolio } from '@/lib/cms/repository';
import { formatDate } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Build Portfolio',
  description:
    'Completed custom PC builds by PC Builders Canada, with the parts used and the reasoning behind each configuration.',
  alternates: { canonical: '/portfolio' },
};

// See src/app/networking/page.tsx for why this window is short.
export const revalidate = 60;

/**
 * Portfolio.
 *
 * Populated from the database as builds are completed and written up. When
 * there is nothing published, the page says exactly that. It does not invent
 * past work, and it does not show sample builds dressed up as delivered ones.
 */
export default async function PortfolioPage() {
  // Ordering is by the admin's own display order first, then newest. The
  // query moved into the CMS repository so the admin screen and this page
  // cannot end up filtering on different things.
  const builds = await listPublishedPortfolio();

  return (
    <>
      <PageHeader
        eyebrow="Portfolio"
        title="Completed builds"
        description="Machines we have built, the parts that went into them, and why those parts and not others."
      />

      <PageShell className="py-12 sm:py-16">
        {builds.length === 0 ? (
          <EmptyState
            title="No build write-ups published yet"
            description="Completed builds are documented and published here as they are finished. Nothing is listed until there is a real machine behind it."
            action={
              <div className="flex flex-col gap-3 sm:flex-row">
                <ButtonLink href="/build">Configure a build</ButtonLink>
                <ButtonLink href="/gaming-pcs" variant="secondary">
                  See configurations
                </ButtonLink>
              </div>
            }
          />
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {builds.map((build) => (
              <Card key={build.id} className="overflow-hidden">
                {build.hero_image_url || build.image_urls.length > 0 ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={build.hero_image_url ?? build.image_urls[0]}
                    alt={`${build.title} build`}
                    loading="lazy"
                    decoding="async"
                    className="aspect-[16/10] w-full object-cover"
                  />
                ) : null}

                <div className="p-6">
                  <p className="text-xs tracking-wide text-gold-400 uppercase">{build.purpose}</p>
                  <h2 className="mt-2 text-xl font-semibold text-white">{build.title}</h2>
                  <p className="mt-3 text-sm leading-relaxed text-ink-300">{build.summary}</p>

                  {build.component_notes?.length ? (
                    <ul className="mt-4 space-y-1 border-t border-ink-700 pt-4 text-sm text-ink-300">
                      {build.component_notes.map((note) => (
                        <li key={note}>{note}</li>
                      ))}
                    </ul>
                  ) : null}

                  {build.verified_performance_notes ? (
                    <div className="mt-4 rounded-md border border-ink-700 bg-ink-900 p-4">
                      <p className="text-xs tracking-wide text-ink-400 uppercase">
                        Measured on this machine
                      </p>
                      <p className="mt-2 text-sm leading-relaxed text-ink-200">
                        {build.verified_performance_notes}
                      </p>
                    </div>
                  ) : null}

                  <p className="mt-4 text-xs text-ink-500">{formatDate(build.created_at)}</p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </PageShell>
    </>
  );
}
