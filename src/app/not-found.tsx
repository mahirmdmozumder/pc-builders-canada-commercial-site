import { ButtonLink, PageShell } from '@/components/ui';

export default function NotFound() {
  return (
    <PageShell className="py-24 text-center">
      <p className="text-xs font-semibold tracking-[0.2em] text-maple-400 uppercase">404</p>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
        That page does not exist
      </h1>
      <p className="mx-auto mt-4 max-w-md text-ink-300">
        The link may be out of date, or the page may have moved. The configurator is the usual
        place to start.
      </p>
      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <ButtonLink href="/build">Build your PC</ButtonLink>
        <ButtonLink href="/" variant="secondary">
          Go to the homepage
        </ButtonLink>
      </div>
    </PageShell>
  );
}
