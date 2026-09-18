'use client';

import { useEffect } from 'react';
import { ButtonLink, PageShell } from '@/components/ui';

/**
 * Route error boundary.
 *
 * Customers see a plain explanation and a way forward. The actual error goes
 * to the console (and to the platform's log collector in production), never
 * to the page: a stack trace on screen is both useless to a customer and a
 * disclosure of internals.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[ui] unhandled route error', error);
  }, [error]);

  return (
    <PageShell className="py-24 text-center">
      <p className="text-xs font-semibold tracking-[0.2em] text-maple-400 uppercase">Error</p>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">
        Something went wrong on our end
      </h1>
      <p className="mx-auto mt-4 max-w-md text-ink-300">
        This page could not load. Nothing you were doing has been charged or lost. Try again, and
        if it keeps happening let us know.
      </p>
      {error.digest ? (
        <p className="mt-3 font-mono text-xs text-ink-500">Reference: {error.digest}</p>
      ) : null}
      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center justify-center rounded-md bg-maple-600 px-6 py-3 text-base font-medium text-white hover:bg-maple-500"
        >
          Try again
        </button>
        <ButtonLink href="/contact" variant="secondary" size="lg">
          Contact us
        </ButtonLink>
      </div>
    </PageShell>
  );
}
