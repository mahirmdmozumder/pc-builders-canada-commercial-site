'use client';

import { useState } from 'react';
import { Alert, Button, Card, Field, Input, Textarea } from '@/components/ui';

export function ContactForm() {
  const [state, setState] = useState<{
    status: 'idle' | 'sending' | 'sent' | 'error';
    message?: string;
    fields?: Record<string, string>;
  }>({ status: 'idle' });

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setState({ status: 'sending' });

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: String(form.get('name') ?? ''),
          email: String(form.get('email') ?? ''),
          phone: String(form.get('phone') ?? '') || null,
          subject: String(form.get('subject') ?? '') || null,
          message: String(form.get('message') ?? ''),
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setState({
          status: 'error',
          message: data.error ?? 'Could not send that message.',
          fields: data.fields,
        });
        return;
      }

      setState({ status: 'sent' });
    } catch {
      setState({
        status: 'error',
        message: 'Could not reach the server. Check your connection and try again.',
      });
    }
  }

  if (state.status === 'sent') {
    return (
      <Card className="p-8 text-center">
        <h2 className="text-xl font-semibold text-white">Message received</h2>
        <p className="mx-auto mt-3 max-w-md text-sm text-ink-300">
          Thanks. We read every message and reply in the order they arrive, usually within one
          business day.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        {state.status === 'error' && state.message ? (
          <Alert tone="danger" title="Could not send">
            {state.message}
          </Alert>
        ) : null}

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Name" htmlFor="name" required error={state.fields?.name}>
            <Input id="name" name="name" autoComplete="name" required />
          </Field>
          <Field label="Email" htmlFor="email" required error={state.fields?.email}>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Phone" htmlFor="phone" hint="Optional">
            <Input id="phone" name="phone" type="tel" autoComplete="tel" />
          </Field>
          <Field label="Subject" htmlFor="subject">
            <Input id="subject" name="subject" maxLength={160} />
          </Field>
        </div>

        <Field
          label="Message"
          htmlFor="message"
          required
          error={state.fields?.message}
          hint="If this is about a machine you own, include what it does, when it started, and anything you have already tried."
        >
          <Textarea id="message" name="message" rows={7} required />
        </Field>

        <Button type="submit" disabled={state.status === 'sending'}>
          {state.status === 'sending' ? 'Sending...' : 'Send message'}
        </Button>
      </form>
    </Card>
  );
}
