'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Button, Card, Field, Input } from '@/components/ui';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { Profile } from '@/types/domain';

export function ProfileForm({ profile, email }: { profile: Profile | null; email: string }) {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !profile) return;

    const form = new FormData(event.currentTarget);
    setStatus('saving');
    setMessage(null);

    // Only these two columns are sent. `role` is not editable here, and the
    // database rejects a role change from a non-admin regardless.
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: String(form.get('full_name') || '') || null,
        phone: String(form.get('phone') || '') || null,
      })
      .eq('id', profile.id);

    if (error) {
      setStatus('error');
      setMessage('Could not save your details.');
      return;
    }

    setStatus('saved');
    setMessage('Saved.');
    router.refresh();
  }

  async function changePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    const form = new FormData(event.currentTarget);
    const password = String(form.get('new_password'));

    if (password.length < 10) {
      setMessage('Use at least 10 characters.');
      setStatus('error');
      return;
    }

    setStatus('saving');
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setStatus('error');
      setMessage(error.message);
      return;
    }
    setStatus('saved');
    setMessage('Password updated.');
    (event.target as HTMLFormElement).reset();
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-white">Your details</h2>

        {message ? (
          <Alert tone={status === 'error' ? 'danger' : 'ok'} className="mt-4">
            {message}
          </Alert>
        ) : null}

        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          <Field label="Email" htmlFor="email" hint="Contact us if you need to change this.">
            <Input id="email" value={email} readOnly disabled />
          </Field>

          <Field label="Name" htmlFor="full_name">
            <Input
              id="full_name"
              name="full_name"
              defaultValue={profile?.full_name ?? ''}
              autoComplete="name"
            />
          </Field>

          <Field label="Phone" htmlFor="phone" hint="Only used if we need to reach you about an order.">
            <Input id="phone" name="phone" type="tel" defaultValue={profile?.phone ?? ''} autoComplete="tel" />
          </Field>

          <Button type="submit" disabled={status === 'saving'}>
            {status === 'saving' ? 'Saving...' : 'Save details'}
          </Button>
        </form>
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-white">Password</h2>
        <form onSubmit={changePassword} className="mt-5 space-y-4">
          <Field
            label="New password"
            htmlFor="new_password"
            required
            hint="At least 10 characters."
          >
            <Input
              id="new_password"
              name="new_password"
              type="password"
              autoComplete="new-password"
              minLength={10}
              required
            />
          </Field>
          <Button type="submit" variant="secondary" disabled={status === 'saving'}>
            Update password
          </Button>
        </form>
      </Card>
    </div>
  );
}
