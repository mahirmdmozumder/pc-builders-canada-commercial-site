import { getSupabaseServerClient } from '@/lib/supabase/server';
import type { ActivityAction } from '@/types/domain';
import type { SessionUser } from '@/lib/auth/session';

/**
 * Admin audit trail.
 *
 * Every state change an administrator makes is recorded with who did it, what
 * changed and when. Two reasons this exists:
 *
 *  - Operationally: when an order total or a stock level looks wrong, the
 *    first question is always "who changed it and when".
 *  - As a control: an admin account with unlogged write access is
 *    indistinguishable from a compromised one.
 *
 * Logging is best-effort. A failed log line must never roll back the action
 * the customer or operator is waiting on, so failures are reported to the
 * server log and swallowed.
 */
export async function logActivity(params: {
  actor: SessionUser;
  action: ActivityAction;
  entityType: string;
  entityId: string | null;
  summary: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const supabase = await getSupabaseServerClient();
    if (!supabase) return;

    await supabase.from('activity_log').insert({
      actor_id: params.actor.id,
      actor_email: params.actor.email,
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId,
      summary: params.summary,
      metadata: params.metadata ?? null,
    });
  } catch (error) {
    console.error('[activity] could not write audit entry', error);
  }
}

/** Describes a field change compactly, for the log summary. */
export function describeChange(field: string, from: unknown, to: unknown): string {
  return `${field}: ${String(from ?? 'none')} -> ${String(to ?? 'none')}`;
}
