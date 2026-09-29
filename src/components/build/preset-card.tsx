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
    <Card className="group flex flex-col overflow-hidden transition-colors hover:border-ink-600">
      <BuildImage
        src={record?.hero_image_url ?? record?.gallery_urls?.[0] ?? null}
        alt={`${preset.name} build`}
        galleryCount={Math.max(0, (record?.gallery_urls?.length ?? 0) - 1)}
        className="rounded-none border-0 border-b border-ink-700"
      />

      <div className="border-b border-ink-700 px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-white">{preset.name}</h3>
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

        <Link
          href={`/build?preset=${preset.slug}`}
          className="block w-full rounded-md border border-ink-600 bg-ink-700 px-4 py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-ink-600"
        >
          Open in configurator
        </Link>
      </div>
    </Card>
  );
}
