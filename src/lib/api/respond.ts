import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

/**
 * API response helpers.
 *
 * The contract: clients get a short, actionable message and nothing else.
 * Stack traces, database error text and internal identifiers stay in the
 * server log, where they are useful, and out of the response, where they are
 * a disclosure risk.
 */

export interface ApiErrorBody {
  error: string;
  /** Field-level messages for form rendering. */
  fields?: Record<string, string>;
}

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function created<T>(data: T) {
  return NextResponse.json(data, { status: 201 });
}

export function badRequest(error: string, fields?: Record<string, string>) {
  return NextResponse.json<ApiErrorBody>({ error, fields }, { status: 400 });
}

export function unauthorized(error = 'You need to be signed in to do that.') {
  return NextResponse.json<ApiErrorBody>({ error }, { status: 401 });
}

/**
 * Used for both "not allowed" and "does not exist" on admin resources, so a
 * probing request cannot map what exists by watching status codes.
 */
export function notFound(error = 'Not found.') {
  return NextResponse.json<ApiErrorBody>({ error }, { status: 404 });
}

export function conflict(error: string) {
  return NextResponse.json<ApiErrorBody>({ error }, { status: 409 });
}

export function serviceUnavailable(error: string) {
  return NextResponse.json<ApiErrorBody>({ error }, { status: 503 });
}

export function serverError(context: string, cause: unknown) {
  console.error(`[api] ${context}`, cause);
  return NextResponse.json<ApiErrorBody>(
    { error: 'Something went wrong on our end. Please try again.' },
    { status: 500 },
  );
}

export function zodErrorResponse(error: ZodError) {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || 'form';
    fields[key] ??= issue.message;
  }
  return badRequest('Please check the highlighted fields.', fields);
}

/** Wraps a handler so an unexpected throw becomes a clean 500, never a trace. */
export async function handle(
  context: string,
  fn: () => Promise<Response>,
): Promise<Response> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof ZodError) return zodErrorResponse(error);
    return serverError(context, error);
  }
}
