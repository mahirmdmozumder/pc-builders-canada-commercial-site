'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Button, Card, Field, Input, Select, Textarea } from '@/components/ui';
import { formatMoney } from '@/lib/utils';
import {
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  QUOTE_STATUSES,
  QUOTE_STATUS_LABELS,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  TICKET_STATUS_LABELS,
  type Order,
  type Quote,
  type SupportTicket,
} from '@/types/domain';

/**
 * Admin write controls.
 *
 * All of these post to /api/admin/*, which re-checks the admin role on the
 * server. None of them trust the fact that this component rendered: a client
 * bundle is not an authorization decision.
 */

function useSaver() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: 'ok' | 'danger'; text: string } | null>(null);

  async function save(url: string, body: unknown, successText = 'Saved.') {
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setMessage({ tone: 'danger', text: data.error ?? 'Could not save that change.' });
        return false;
      }
      setMessage({ tone: 'ok', text: successText });
      router.refresh();
      return true;
    } catch {
      setMessage({ tone: 'danger', text: 'Could not reach the server.' });
      return false;
    } finally {
      setSaving(false);
    }
  }

  return { save, saving, message };
}

export function OrderControls({ order }: { order: Order }) {
  const { save, saving, message } = useSaver();
  const [status, setStatus] = useState(order.status);
  const [notes, setNotes] = useState(order.internal_notes ?? '');

  return (
    <Card className="p-5">
      <h3 className="text-sm font-semibold tracking-wide text-white uppercase">Manage</h3>
      {message ? (
        <Alert tone={message.tone} className="mt-3">
          {message.text}
        </Alert>
      ) : null}

      <div className="mt-4 space-y-4">
        <Field
          label="Order status"
          htmlFor="order-status"
          hint="Changing this emails the customer."
        >
          <Select
            id="order-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
          >
            {ORDER_STATUSES.map((value) => (
              <option key={value} value={value}>
                {ORDER_STATUS_LABELS[value]}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Internal notes"
          htmlFor="order-notes"
          hint="Staff only. Never shown to the customer."
        >
          <Textarea
            id="order-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={5}
          />
        </Field>

        <Button
          onClick={() =>
            save(`/api/admin/orders/${order.id}`, { status, internal_notes: notes || null })
          }
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save changes'}
        </Button>
      </div>
    </Card>
  );
}

export function QuoteControls({ quote }: { quote: Quote }) {
  const { save, saving, message } = useSaver();
  const [status, setStatus] = useState(quote.status);
  const [notes, setNotes] = useState(quote.internal_notes ?? '');
  const [quoted, setQuoted] = useState(
    quote.quoted_total_cents !== null ? (quote.quoted_total_cents / 100).toFixed(2) : '',
  );

  return (
    <Card className="p-5">
      <h3 className="text-sm font-semibold tracking-wide text-white uppercase">Manage</h3>
      {message ? (
        <Alert tone={message.tone} className="mt-3">
          {message.text}
        </Alert>
      ) : null}

      <div className="mt-4 space-y-4">
        <Field label="Status" htmlFor="quote-status">
          <Select
            id="quote-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
          >
            {QUOTE_STATUSES.map((value) => (
              <option key={value} value={value}>
                {QUOTE_STATUS_LABELS[value]}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Quoted total (CAD)"
          htmlFor="quote-total"
          hint={`Customer estimate was ${formatMoney(quote.estimated_total_cents)}.`}
        >
          <Input
            id="quote-total"
            type="number"
            min="0"
            step="0.01"
            value={quoted}
            onChange={(e) => setQuoted(e.target.value)}
          />
        </Field>

        <Field label="Internal notes" htmlFor="quote-notes" hint="Staff only.">
          <Textarea
            id="quote-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={5}
          />
        </Field>

        <Button
          onClick={() =>
            save(`/api/admin/quotes/${quote.id}`, {
              status,
              internal_notes: notes || null,
              // Parsed to cents here; the schema rejects anything non-integer.
              quoted_total_cents: quoted ? Math.round(Number(quoted) * 100) : null,
            })
          }
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save changes'}
        </Button>
      </div>
    </Card>
  );
}

export function TicketControls({ ticket }: { ticket: SupportTicket }) {
  const router = useRouter();
  const { save, saving, message } = useSaver();
  const [status, setStatus] = useState(ticket.status);
  const [priority, setPriority] = useState(ticket.priority);
  const [notes, setNotes] = useState(ticket.internal_notes ?? '');
  const [reply, setReply] = useState('');
  const [internal, setInternal] = useState(false);
  const [replying, setReplying] = useState(false);

  async function postReply() {
    if (!reply.trim()) return;
    setReplying(true);
    const response = await fetch(`/api/support/${ticket.id}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: reply, is_internal: internal }),
    });
    setReplying(false);
    if (response.ok) {
      setReply('');
      router.refresh();
    }
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h3 className="text-sm font-semibold tracking-wide text-white uppercase">Reply</h3>
        <div className="mt-4 space-y-3">
          <Textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            rows={5}
            aria-label="Reply to customer"
            placeholder={internal ? 'Internal note, not sent to the customer' : 'Reply to the customer'}
          />
          <label className="flex items-center gap-2 text-sm text-ink-300">
            <input
              type="checkbox"
              checked={internal}
              onChange={(e) => setInternal(e.target.checked)}
              className="size-4 rounded border-ink-600 bg-ink-900 accent-maple-500"
            />
            Internal note (not visible to the customer)
          </label>
          <Button onClick={postReply} disabled={replying || !reply.trim()}>
            {replying ? 'Posting...' : internal ? 'Save internal note' : 'Send reply'}
          </Button>
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="text-sm font-semibold tracking-wide text-white uppercase">Manage</h3>
        {message ? (
          <Alert tone={message.tone} className="mt-3">
            {message.text}
          </Alert>
        ) : null}

        <div className="mt-4 space-y-4">
          <Field label="Status" htmlFor="ticket-status">
            <Select
              id="ticket-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as typeof status)}
            >
              {TICKET_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {TICKET_STATUS_LABELS[value]}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Priority" htmlFor="ticket-priority">
            <Select
              id="ticket-priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as typeof priority)}
            >
              {TICKET_PRIORITIES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Internal notes" htmlFor="ticket-notes" hint="Staff only.">
            <Textarea
              id="ticket-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
            />
          </Field>

          <Button
            onClick={() =>
              save(`/api/admin/tickets/${ticket.id}`, {
                status,
                priority,
                internal_notes: notes || null,
              })
            }
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save changes'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
