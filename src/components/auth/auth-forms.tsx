'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Alert, Button, Card, Field, Input } from '@/components/ui';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

/**
 * Auth forms.
 *
 * Sign-in runs through the Supabase browser client, which sets the session
 * cookies that middleware then refreshes. Errors are shown as Supabase
 * reports them, with one deliberate exception: a failed sign-in never
 * distinguishes "no such account" from "wrong password", because that
 * difference tells an attacker which addresses are registered.
 */

function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-md">
      <Card className="p-8">
        <h1 className="text-2xl font-semibold text-white">{title}</h1>
        <p className="mt-2 text-sm text-ink-300">{description}</p>
        <div className="mt-6">{children}</div>
      </Card>
      {footer ? <div className="mt-6 text-center text-sm text-ink-400">{footer}</div> : null}
    </div>
  );
}

function NotConfiguredNotice() {
  return (
    <Alert tone="warn" title="Accounts are not available on this deployment">
      <p>
        No authentication backend is configured here, so sign-in is switched off. Everything that
        does not need an account still works: the configurator, saved drafts in your browser, and
        quote requests.
      </p>
      <Link href="/build" className="mt-3 inline-block font-medium text-maple-400">
        Back to the configurator &rarr;
      </Link>
    </Alert>
  );
}

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') ?? '/account';
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    return (
      <AuthShell title="Sign in" description="Access your orders, builds and quotes.">
        <NotConfiguredNotice />
      </AuthShell>
    );
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);

    const { error: signInError } = await supabase!.auth.signInWithPassword({
      email: String(form.get('email')),
      password: String(form.get('password')),
    });

    if (signInError) {
      setError('That email and password combination did not work.');
      setPending(false);
      return;
    }

    router.push(next);
    router.refresh();
  }

  return (
    <AuthShell
      title="Sign in"
      description="Access your orders, saved builds and quote history."
      footer={
        <>
          No account?{' '}
          <Link href="/register" className="text-maple-400 hover:text-maple-300">
            Create one
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {params.get('registered') ? (
          <Alert tone="ok">Account created. Sign in to continue.</Alert>
        ) : null}
        {error ? <Alert tone="danger">{error}</Alert> : null}

        <Field label="Email" htmlFor="email" required>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </Field>

        <Field label="Password" htmlFor="password" required>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </Field>

        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? 'Signing in...' : 'Sign in'}
        </Button>

        <p className="text-center text-sm">
          <Link href="/reset-password" className="text-ink-400 hover:text-ink-200">
            Forgot your password?
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}

export function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    return (
      <AuthShell title="Create an account" description="Save builds and track your orders.">
        <NotConfiguredNotice />
      </AuthShell>
    );
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get('password'));

    if (password.length < 10) {
      setError('Use at least 10 characters.');
      return;
    }

    setPending(true);
    setError(null);

    const { data, error: signUpError } = await supabase!.auth.signUp({
      email: String(form.get('email')),
      password,
      options: {
        data: { full_name: String(form.get('full_name') || '') },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setPending(false);
      return;
    }

    // With email confirmation on, there is no session yet.
    if (!data.session) {
      setNotice('Check your email for a confirmation link, then sign in.');
      setPending(false);
      return;
    }

    router.push('/account');
    router.refresh();
  }

  return (
    <AuthShell
      title="Create an account"
      description="Save builds, follow an order through assembly, and keep your quote history in one place."
      footer={
        <>
          Already have one?{' '}
          <Link href="/login" className="text-maple-400 hover:text-maple-300">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {error ? <Alert tone="danger">{error}</Alert> : null}
        {notice ? <Alert tone="ok">{notice}</Alert> : null}

        <Field label="Name" htmlFor="full_name">
          <Input id="full_name" name="full_name" autoComplete="name" />
        </Field>

        <Field label="Email" htmlFor="email" required>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </Field>

        <Field
          label="Password"
          htmlFor="password"
          required
          hint="At least 10 characters. A passphrase of a few words is both stronger and easier to remember."
        >
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={10}
            required
          />
        </Field>

        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? 'Creating account...' : 'Create account'}
        </Button>

        <p className="text-xs leading-relaxed text-ink-500">
          By creating an account you agree to our{' '}
          <Link href="/legal/terms" className="text-ink-300 underline">
            terms of service
          </Link>{' '}
          and{' '}
          <Link href="/legal/privacy" className="text-ink-300 underline">
            privacy policy
          </Link>
          .
        </p>
      </form>
    </AuthShell>
  );
}

export function ResetRequestForm() {
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    return (
      <AuthShell title="Reset your password" description="We will email you a reset link.">
        <NotConfiguredNotice />
      </AuthShell>
    );
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);

    await supabase!.auth.resetPasswordForEmail(String(form.get('email')), {
      redirectTo: `${window.location.origin}/auth/callback?next=/account/profile`,
    });

    // Always reports success: confirming whether an address is registered
    // would leak account existence to anyone who asks.
    setSent(true);
    setPending(false);
  }

  return (
    <AuthShell
      title="Reset your password"
      description="Enter your email and we will send a reset link."
      footer={
        <Link href="/login" className="text-maple-400 hover:text-maple-300">
          Back to sign in
        </Link>
      }
    >
      {sent ? (
        <Alert tone="ok" title="Check your email">
          If an account exists for that address, a reset link is on its way.
        </Alert>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Email" htmlFor="email" required>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </Field>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? 'Sending...' : 'Send reset link'}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
