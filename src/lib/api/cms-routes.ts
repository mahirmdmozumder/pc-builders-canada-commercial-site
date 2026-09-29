import type { ZodType } from 'zod';
import { getAdminOrNull } from '@/lib/auth/session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { logActivity } from '@/lib/admin/activity';
import { revalidateStorefront } from '@/lib/catalog/revalidate';
import {
  conflict,
  created,
  handle,
  notFound,
  ok,
  serviceUnavailable,
  zodErrorResponse,
} from '@/lib/api/respond';

/**
 * Admin CRUD for content tables.
 *
 * Six collections need the same five things: check the admin role, validate
 * the body, write through the SESSION client so Row Level Security applies,
 * record the change in the activity log, and rebuild the storefront. Writing
 * that out six times would mean six chances for one of them to be forgotten,
 * and the one most likely to be forgotten is the session client — which is
 * what makes RLS a real second line of defence rather than a decoration.
 *
 * The service-role client is deliberately NOT used here. If a route ever lost
 * its admin check, a session-client write fails closed at the database. A
 * service-role write would quietly succeed.
 */

/**
 * Tables this module is allowed to touch.
 *
 * A union rather than `string`, for two reasons. The Supabase client needs a
 * literal to infer row types at all, and narrowing it here means a typo in a
 * route file is a compile error rather than a runtime 500 against a table that
 * does not exist. It also means these handlers cannot be pointed at `orders`
 * or `profiles` by accident.
 */
export type CmsTable =
  | 'services'
  | 'build_presets'
  | 'portfolio_builds'
  | 'promotions'
  | 'component_categories';

export interface CmsResource {
  /** Table name, as it exists in Postgres. */
  table: CmsTable;
  /** Singular and lower case, for log lines and error messages. */
  label: string;
  /** Column holding the primary key. Defaults to `id`. */
  idColumn?: string;
  /** Builds a readable name for the activity log. */
  describe: (row: Record<string, unknown>) => string;
}

type RouteParams = { params: Promise<Record<string, string>> };

function idFrom(resource: CmsResource, resolved: Record<string, string>): string | undefined {
  return resolved[resource.idColumn ?? 'id'] ?? resolved.id;
}

export function createHandler(resource: CmsResource, schema: ZodType) {
  return async function POST(request: Request) {
    return handle(`POST ${resource.table}`, async () => {
      if (!isSupabaseConfigured) {
        return serviceUnavailable('Content management needs a database connection.');
      }
      const admin = await getAdminOrNull();
      if (!admin) return notFound();

      const parsed = schema.safeParse(await request.json());
      if (!parsed.success) return zodErrorResponse(parsed.error);

      const supabase = await getSupabaseServerClient();
      if (!supabase) return serviceUnavailable('Content management is unavailable right now.');

      const { data, error } = await supabase
        .from(resource.table)
        .insert(parsed.data as never)
        .select('*')
        .single();

      if (error) {
        // 23505 is a unique violation, which here always means the id or slug
        // is taken. Saying so beats a generic failure nobody can act on.
        if (error.code === '23505') {
          return conflict(`A ${resource.label} with that id or slug already exists.`);
        }
        console.error(`[cms] insert into ${resource.table} failed`, error.message);
        return serviceUnavailable(`Could not create that ${resource.label}.`);
      }

      const row = data as Record<string, unknown>;
      await logActivity({
        actor: admin,
        action: 'content.created',
        entityType: resource.table,
        entityId: String(row[resource.idColumn ?? 'id'] ?? ''),
        summary: `Created ${resource.label}: ${resource.describe(row)}`,
      });

      revalidateStorefront();
      return created(row);
    });
  };
}

export function updateHandler(resource: CmsResource, schema: ZodType) {
  return async function PATCH(request: Request, { params }: RouteParams) {
    return handle(`PATCH ${resource.table}`, async () => {
      if (!isSupabaseConfigured) {
        return serviceUnavailable('Content management needs a database connection.');
      }
      const admin = await getAdminOrNull();
      if (!admin) return notFound();

      const id = idFrom(resource, await params);
      if (!id) return notFound();

      const parsed = schema.safeParse(await request.json());
      if (!parsed.success) return zodErrorResponse(parsed.error);

      const values = parsed.data as Record<string, unknown>;
      if (Object.keys(values).length === 0) return ok({ updated: false });

      const supabase = await getSupabaseServerClient();
      if (!supabase) return serviceUnavailable('Content management is unavailable right now.');

      const { data, error } = await supabase
        .from(resource.table)
        .update(values as never)
        .eq(resource.idColumn ?? 'id', id)
        .select('*')
        .maybeSingle();

      if (error) {
        if (error.code === '23505') {
          return conflict(`Another ${resource.label} already uses that slug.`);
        }
        console.error(`[cms] update ${resource.table} failed`, error.message);
        return serviceUnavailable(`Could not save that ${resource.label}.`);
      }
      // No row back means it either does not exist or RLS hid it. Both are
      // "not found" as far as the caller is entitled to know.
      if (!data) return notFound(`That ${resource.label} could not be found.`);

      await logActivity({
        actor: admin,
        action: 'content.updated',
        entityType: resource.table,
        entityId: String(id),
        summary: `Updated ${resource.label}: ${resource.describe(data as Record<string, unknown>)}`,
        metadata: { fields: Object.keys(values) },
      });

      revalidateStorefront();
      return ok(data as Record<string, unknown>);
    });
  };
}

/**
 * Archive, never delete.
 *
 * Orders, saved builds and quotes reference content by id. Removing a row
 * would rewrite what a customer actually bought, so everything here moves to
 * `status: 'archived'` and stays readable.
 */
export function archiveHandler(resource: CmsResource) {
  return async function DELETE(_request: Request, { params }: RouteParams) {
    return handle(`DELETE ${resource.table}`, async () => {
      if (!isSupabaseConfigured) {
        return serviceUnavailable('Content management needs a database connection.');
      }
      const admin = await getAdminOrNull();
      if (!admin) return notFound();

      const id = idFrom(resource, await params);
      if (!id) return notFound();

      const supabase = await getSupabaseServerClient();
      if (!supabase) return serviceUnavailable('Content management is unavailable right now.');

      const { data, error } = await supabase
        .from(resource.table)
        .update({ status: 'archived' } as never)
        .eq(resource.idColumn ?? 'id', id)
        .select('*')
        .maybeSingle();

      if (error) {
        console.error(`[cms] archive ${resource.table} failed`, error.message);
        return serviceUnavailable(`Could not archive that ${resource.label}.`);
      }
      if (!data) return notFound(`That ${resource.label} could not be found.`);

      await logActivity({
        actor: admin,
        action: 'content.archived',
        entityType: resource.table,
        entityId: String(id),
        summary: `Archived ${resource.label}: ${resource.describe(data as Record<string, unknown>)}`,
      });

      revalidateStorefront();
      return ok({ archived: true });
    });
  };
}
