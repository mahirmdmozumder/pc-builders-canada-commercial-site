import type { CmsResource } from '@/lib/api/cms-routes';

/**
 * Resource descriptors shared by each collection route and its item route.
 *
 * Kept in one place so a table name or label cannot drift between the two.
 */

export const serviceResource: CmsResource = {
  table: 'services',
  label: 'service',
  idColumn: 'id',
  describe: (row) => String(row.name ?? row.id ?? ''),
};

export const presetResource: CmsResource = {
  table: 'build_presets',
  label: 'build preset',
  idColumn: 'id',
  describe: (row) => String(row.name ?? row.id ?? ''),
};

export const portfolioResource: CmsResource = {
  table: 'portfolio_builds',
  label: 'portfolio build',
  idColumn: 'id',
  describe: (row) => String(row.title ?? row.id ?? ''),
};

export const promotionResource: CmsResource = {
  table: 'promotions',
  label: 'promotion',
  idColumn: 'id',
  describe: (row) => String(row.title ?? row.id ?? ''),
};
