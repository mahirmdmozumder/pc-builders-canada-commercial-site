import Link from 'next/link';
import { Badge, Card } from '@/components/ui';
import { formatMoney } from '@/lib/utils';
import { CATEGORY_LABELS, type ComponentCategory } from '@/lib/catalog/types';
import type { BuildPreset } from '@/lib/catalog/presets';
import type { BuildPresetRecord } from '@/lib/cms/types';
import { BuildImage } from '@/components/shop/product-image';

export interface PresetSummary {
  /**
   * Either the in-repo preset or a database row. They are the same shape for
   * everything this card renders; only the database row carries photographs.
   */
  preset: BuildPreset | BuildPresetRecord;
  subtotalCents: number;
  estimatedTotalCents: number;
  estimatedWatts: number;
  recommendedPsuWatts: number;
  compatible: boolean;
  keyParts: { category: ComponentCategory; name: string }[];
  /** True when some part of the configuration is out of stock. */
  unavailable: boolean;
}

const KEY_CATEGORIES: ComponentCategory[] = ['cpu', 'gpu', 'ram', 'storage'];

export function summaryKeyCategories() {
  return KEY_CATEGORIES;
}

export function PresetCard({ summary }: { summary: PresetSummary }) {
  const { preset } = summary;
  // Only a database-backed preset has photographs. The in-repo fallback does
  // not, so the frame falls through to its placeholder rather than breaking.
  const record = 'hero_image_url' in preset ? preset : null;

  return (
    /* `relative` is what the title link's overlay below is positioned against,
       so the whole card becomes the click target. */
    <Card className="group relative flex flex-col overflow-hidden transition-colors hover:border-ink-600">
      <BuildImage
        src={record?.hero_image_url ?? record?.gallery_urls?.[0] ?? null}
        alt={`${preset.name} build`}
        galleryCount={Math.max(0, (record?.gallery_urls?.length ?? 0) - 1)}
        className="rounded-none border-0 border-b border-ink-700"
      />

      <div className="border-b border-ink-700 px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-white">
              {/* Links to the machine's own page rather than straight into
                  the configurator, so the page can be found and shared.

                  The `after:` pseudo-element stretches this one link over the
                  whole card, so clicking anywhere on it opens the machine —
                  previously only the name itself was clickable, which meant
                  most of a large card did nothing.

                  Done this way rather than by wrapping the card in an anchor
                  because the card holds a SECOND link to the configurator.
                  Nesting two anchors is invalid HTML and behaves differently in
                  every browser; an overlay keeps one anchor per destination,
                  one tab stop each, and the card's accessible name is still the
                  machine's name rather than the whole card read aloud. */}
              <Link
                href={`/pre-built-gaming-pcs/${preset.slug}`}
                className="hover:text-gold-400 after:absolute after:inset-0 after:content-['']"
              >
                {preset.name}
              </Link>
            </h3>
            <p className="mt-1 text-sm text-ink-300">{preset.tagline}</p>
          </div>
          {summary.compatible ? (
            <Badge tone="ok">Checks pass</Badge>
          ) : (
            <Badge tone="warn">Review</Badge>
          )}
        </div>
      </div>

      <dl className="divide-y divide-ink-700 px-5 text-sm">
        {summary.keyParts.map((part) => (
          <div key={part.category + part.name} className="flex justify-between gap-4 py-2.5">
            <dt className="shrink-0 text-ink-400">{CATEGORY_LABELS[part.category]}</dt>
            <dd className="truncate text-right text-ink-100">{part.name}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-auto space-y-4 px-5 py-4">
        <div className="flex items-end justify-between border-t border-ink-700 pt-4">
          <div>
            <p className="text-xs tracking-wide text-ink-400 uppercase">Parts from</p>
            <p className="tnum text-2xl font-semibold text-white">
              {formatMoney(summary.subtotalCents)}
            </p>
            <p className="mt-1 text-xs text-ink-400">
              Estimated {formatMoney(summary.estimatedTotalCents)} with assembly, shipping and tax
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs tracking-wide text-ink-400 uppercase">Est. draw</p>
            <p className="tnum text-sm font-medium text-ink-100">{summary.estimatedWatts} W</p>
          </div>
        </div>

        {/* `relative z-10` lifts this above the title link's overlay. Without
            it the overlay would sit on top and swallow the click, sending
            somebody to the machine's page when they asked for the
            configurator. */}
        <Link
          href={`/build?preset=${preset.slug}`}
          className="relative z-10 block w-full rounded-md border border-ink-600 bg-ink-700 px-4 py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-ink-600"
        >
          Open in configurator
        </Link>
      </div>
    </Card>
  );
}
