'use client';

import { useState } from 'react';
import { Alert, Button, Card, Field, Input, Select, Textarea } from '@/components/ui';

/**
 * Register interest in PBC POS.
 *
 * ---------------------------------------------------------------------------
 * WHAT IT ASKS, AND WHAT IT DOES NOT
 * ---------------------------------------------------------------------------
 * Five useful fields and nothing else. Every extra box on a form somebody fills
 * in out of curiosity is a reason to close the tab, and a lead with a name, a
 * restaurant and an email is already worth having.
 *
 * It does NOT ask for a budget. The product has no price, so a budget figure
 * would be a number neither side could stand behind — and asking for one
 * implies there is something to buy, which there is not yet.
 *
 * Till count is free text rather than a number input. "Two, maybe three if the
 * patio opens" tells you more about the restaurant than 2 does.
 */
export function PosInterestForm() {
  const [name, setName] = useState('');
  const [restaurant, setRestaurant] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [contact, setContact] = useState<'email' | 'phone'>('email');
  const [tills, setTills] = useState('');
  const [current, setCurrent] = useState('');
  const [notes, setNotes] = useState('');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);

    try {
      const response = await fetch('/api/pos-interest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: name.trim(),
          restaurant_name: restaurant.trim(),
          customer_email: email.trim(),
          customer_phone: phone.trim() || null,
          preferred_contact: contact,
          till_count: tills.trim() || null,
          current_system: current.trim() || null,
          customer_notes: notes.trim() || null,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        reference?: string;
        error?: string;
      };
      if (!response.ok) throw new Error(data.error ?? 'That could not be sent.');

      setReference(data.reference ?? 'sent');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'That could not be sent.');
      setBusy(false);
    }
  }

  // Replaces the form rather than sitting above it, so a success cannot be
  // mistaken for an invitation to send a second one.
  if (reference) {
    return (
      <Card className="border-ok-600/40 p-6">
        <h2 className="text-lg font-semibold text-white">You&rsquo;re on the list</h2>
        <p className="mt-3 text-sm leading-relaxed text-ink-300">
          Thanks &mdash; we&rsquo;ve got it, and there&rsquo;s a confirmation on its way to{' '}
          <span className="text-ink-100">{email}</span>.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-ink-300">
          There&rsquo;s nothing to buy yet and no date to give you. What it does mean is that
          you&rsquo;ll hear first, and that what you&rsquo;ve told us about how your restaurant runs
          feeds into what gets built.
        </p>
        <p className="tnum mt-4 border-t border-ink-700 pt-4 text-xs text-ink-500">
          Reference {reference}
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold text-white">Register your interest</h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-400">
        No cost, no commitment, and nothing to sign. It puts you on the list to hear first, and
        tells us what to build.
      </p>

      <form className="mt-6 space-y-5" onSubmit={submit}>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Your name" htmlFor="pos-name" required>
            <Input
              id="pos-name"
              value={name}
              required
              minLength={2}
              maxLength={120}
              autoComplete="name"
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <Field label="Restaurant" htmlFor="pos-restaurant" required>
            <Input
              id="pos-restaurant"
              value={restaurant}
              required
              minLength={2}
              maxLength={120}
              onChange={(e) => setRestaurant(e.target.value)}
            />
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Email" htmlFor="pos-email" required>
            <Input
              id="pos-email"
              type="email"
              value={email}
              required
              maxLength={160}
              autoComplete="email"
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field label="Phone" htmlFor="pos-phone" hint="Optional.">
            <Input
              id="pos-phone"
              type="tel"
              value={phone}
              maxLength={40}
              autoComplete="tel"
              onChange={(e) => setPhone(e.target.value)}
            />
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="How many tills?"
            htmlFor="pos-tills"
            hint="A rough answer is fine."
          >
            <Input
              id="pos-tills"
              value={tills}
              maxLength={60}
              placeholder="Two, plus one on the patio in summer"
              onChange={(e) => setTills(e.target.value)}
            />
          </Field>
          <Field
            label="What are you using now?"
            htmlFor="pos-current"
            hint="Optional, but it helps."
          >
            <Input
              id="pos-current"
              value={current}
              maxLength={120}
              placeholder="Square, Clover, an old till, nothing yet"
              onChange={(e) => setCurrent(e.target.value)}
            />
          </Field>
        </div>

        <Field
          label="Anything that would make your life easier?"
          htmlFor="pos-notes"
          hint="What your current system gets wrong is the most useful thing you can tell us."
        >
          <Textarea
            id="pos-notes"
            rows={4}
            maxLength={2000}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Field>

        <Field label="Best way to reach you" htmlFor="pos-contact">
          <Select
            id="pos-contact"
            value={contact}
            onChange={(e) => setContact(e.target.value as 'email' | 'phone')}
          >
            <option value="email">Email</option>
            <option value="phone">Phone</option>
          </Select>
        </Field>

        {error ? <Alert tone="danger">{error}</Alert> : null}

        <div className="flex flex-wrap items-center gap-4">
          <Button type="submit" size="lg" disabled={busy}>
            {busy ? 'Sending…' : 'Register interest'}
          </Button>
          <span className="text-xs text-ink-500">We don&rsquo;t share your details with anyone.</span>
        </div>
      </form>
    </Card>
  );
}
