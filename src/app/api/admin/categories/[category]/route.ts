import { updateHandler, type CmsResource } from '@/lib/api/cms-routes';
import { adminCategorySchema } from '@/lib/validation/schemas';

/**
 * Category display metadata.
 *
 * PATCH only, and deliberately so. There is no POST because a category is an
 * enum value the compatibility engine switches on, and no DELETE because a
 * category cannot be removed while orders reference parts in it. What an admin
 * edits here is presentation: label, description, image, ordering, and whether
 * the category is shown at all.
 *
 * Hiding a category with `active: false` removes it from storefront listings
 * without touching a single product, which is the safe way to retire a line.
 */
const resource: CmsResource = {
  table: 'component_categories',
  label: 'category',
  idColumn: 'category',
  describe: (row) => String(row.label ?? row.category ?? ''),
};

export const PATCH = updateHandler(resource, adminCategorySchema.partial());
