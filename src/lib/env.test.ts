import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Guards the one property of env.ts that cannot be checked at runtime.
 *
 * Next.js exposes a NEXT_PUBLIC_ variable to the browser by textually
 * replacing `process.env.NEXT_PUBLIC_NAME` with its value during bundling.
 * A dynamic read such as `process.env[name]` cannot be substituted, so it
 * works on the server and silently returns undefined in the browser.
 *
 * The symptom is horrible to diagnose: the server renders a page as though
 * the service were configured, the browser rehydrates it as though it were
 * not, and the page visibly changes after load. It shipped once as
 * "Accounts are not available on this deployment" on a correctly configured
 * deployment, which is why this test exists.
 *
 * A type checker cannot catch it and a unit test cannot execute it, because
 * the behaviour belongs to the bundler. Reading the source is the check.
 */

const ENV_SOURCE = readFileSync(join(process.cwd(), 'src/lib/env.ts'), 'utf8');

/** Strips comments so prose about the rule is not mistaken for code. */
function sourceWithoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

const CODE = sourceWithoutComments(ENV_SOURCE);

const PUBLIC_VARS = [
  'NEXT_PUBLIC_SITE_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
];

describe('environment access', () => {
  it('never reads process.env with a computed key', () => {
    // `process.env[anything]` defeats the bundler substitution entirely.
    expect(CODE).not.toMatch(/process\.env\s*\[/);
  });

  it.each(PUBLIC_VARS)('reads %s as a literal property', (name) => {
    expect(CODE).toContain(`process.env.${name}`);
  });

  it('exposes no server-only secret through a NEXT_PUBLIC_ name', () => {
    // A secret under a NEXT_PUBLIC_ name would be compiled into the bundle
    // every visitor downloads.
    for (const secret of [
      'SUPABASE_SERVICE_ROLE_KEY',
      'STRIPE_SECRET_KEY',
      'STRIPE_WEBHOOK_SECRET',
      'RESEND_API_KEY',
    ]) {
      expect(CODE).not.toContain(`NEXT_PUBLIC_${secret}`);
    }
  });
});
