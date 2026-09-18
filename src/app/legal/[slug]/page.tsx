import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Alert, PageHeader, PageShell } from '@/components/ui';
import { POLICIES, getPolicy } from '@/content/policies';

export function generateStaticParams() {
  return POLICIES.map((policy) => ({ slug: policy.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const policy = getPolicy(slug);
  if (!policy) return {};
  return {
    title: policy.title,
    description: policy.description,
    alternates: { canonical: `/legal/${policy.slug}` },
  };
}

export default async function PolicyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const policy = getPolicy(slug);
  if (!policy) notFound();

  return (
    <>
      <PageHeader eyebrow="Policies" title={policy.title} description={policy.summary} />

      <PageShell className="py-12 sm:py-16">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-start">
          <article className="max-w-3xl">
            {/* Shown until a lawyer has reviewed the text. Publishing policy
                language as settled when it is not is the kind of claim this
                project deliberately avoids. */}
            <Alert tone="warn" title="Draft policy pending legal review">
              This page describes how the business intends to operate. It has not been reviewed by a
              lawyer, and some sections still contain placeholders. Consumer protection legislation
              in your province may give you rights beyond anything written here.
            </Alert>

            <div className="mt-10 space-y-10">
              {policy.sections.map((section) => (
                <section key={section.heading}>
                  <h2 className="text-xl font-semibold tracking-tight text-white">
                    {section.heading}
                  </h2>
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph} className="mt-3 leading-relaxed text-ink-300">
                      {paragraph}
                    </p>
                  ))}
                  {section.bullets ? (
                    <ul className="mt-4 space-y-2">
                      {section.bullets.map((bullet) => (
                        <li key={bullet} className="flex gap-3 text-ink-300">
                          <span
                            className="mt-2 size-1.5 shrink-0 rounded-full bg-maple-500"
                            aria-hidden
                          />
                          <span className="leading-relaxed">{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </section>
              ))}
            </div>

            <p className="mt-12 border-t border-ink-700 pt-6 text-sm text-ink-500">
              Status: {policy.lastReviewed}
            </p>
          </article>

          <nav aria-label="Policies" className="lg:sticky lg:top-24">
            <h2 className="text-xs font-semibold tracking-[0.16em] text-ink-300 uppercase">
              All policies
            </h2>
            <ul className="mt-4 space-y-2">
              {POLICIES.map((item) => (
                <li key={item.slug}>
                  <Link
                    href={`/legal/${item.slug}`}
                    aria-current={item.slug === policy.slug ? 'page' : undefined}
                    className={
                      item.slug === policy.slug
                        ? 'text-sm font-medium text-white'
                        : 'text-sm text-ink-400 hover:text-ink-100'
                    }
                  >
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </PageShell>
    </>
  );
}
