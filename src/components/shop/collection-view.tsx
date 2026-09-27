import { ButtonLink, EmptyState, PageHeader, PageShell, SectionHeading } from '@/components/ui';
import { ProductCard } from '@/components/shop/product-card';
import { getCatalogSource, listComponents } from '@/lib/catalog/repository';
import type { CollectionGroup, ShopCollection } from '@/lib/catalog/collections';

/**
 * Renders a storefront collection page from its definition.
 *
 * All three collection routes are the same page with different copy and
 * different queries, so the layout lives here once. The routes exist as
 * separate files purely for their URLs and metadata.
 */
export async function CollectionView({ collection }: { collection: ShopCollection }) {
  const [primary, secondary] = await Promise.all([
    listComponents(collection.primary.query),
    collection.secondary ? listComponents(collection.secondary.query) : Promise.resolve([]),
  ]);

  const sampleData = getCatalogSource() === 'sample';

  return (
    <>
      <PageHeader
        eyebrow={collection.eyebrow}
        title={collection.title}
        description={collection.description}
        actions={
          <>
            <ButtonLink href="/quote">Ask for a quote</ButtonLink>
            <ButtonLink href="/contact" variant="secondary">
              Talk it through
            </ButtonLink>
          </>
        }
      />

      <PageShell className="py-12 sm:py-16">
        {sampleData ? (
          <p className="mb-8 rounded-md border border-ink-600 bg-ink-850 px-4 py-3 text-sm text-ink-300">
            This deployment has no database connected, so the list below comes from the in-repo
            sample catalogue. Prices were checked against Canadian retail on the date shown per
            item; stock counts are placeholders, not real availability.
          </p>
        ) : null}

        <Group group={collection.primary} components={primary} />

        {collection.secondary ? (
          <div className="mt-16">
            <Group group={collection.secondary} components={secondary} />
          </div>
        ) : null}
      </PageShell>

      <section className="border-t border-ink-700 bg-ink-850">
        <PageShell className="py-16 sm:py-20">
          <SectionHeading
            eyebrow="Before you buy"
            title="What actually matters here"
            description="The things worth knowing before spending money, including where the expensive option is not the better one."
          />
          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            {collection.notes.map((note) => (
              <div key={note.title} className="rounded-lg border border-ink-700 bg-ink-900 p-6">
                <h3 className="text-base font-semibold text-white">{note.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-ink-300">{note.body}</p>
              </div>
            ))}
          </div>
        </PageShell>
      </section>
    </>
  );
}

function Group({
  group,
  components,
}: {
  group: CollectionGroup;
  components: Awaited<ReturnType<typeof listComponents>>;
}) {
  return (
    <section>
      <SectionHeading title={group.heading} description={group.description} />
      <div className="mt-8">
        {components.length === 0 ? (
          <EmptyState
            title={group.emptyMessage}
            description="Tell us what you are trying to build and we will source it and quote the work."
            action={<ButtonLink href="/quote">Ask for a quote</ButtonLink>}
          />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {components.map((component) => (
              <ProductCard key={component.id} component={component} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
