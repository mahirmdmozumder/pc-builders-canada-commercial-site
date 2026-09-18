'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Button, Card, CardHeader, Field, Input, Select, Textarea } from '@/components/ui';
import { TicketStatusBadge } from '@/components/account/status-badge';
import { formatDateTime } from '@/lib/utils';
import {
  TICKET_CATEGORIES,
  TICKET_CATEGORY_LABELS,
  type SupportTicket,
  type TicketMessage,
} from '@/types/domain';

export function SupportView({
  tickets,
  messages,
}: {
  tickets: SupportTicket[];
  /** Customer-visible messages only; internal notes are filtered server-side. */
  messages: Record<string, TicketMessage[]>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(tickets.length === 0);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [activeTicket, setActiveTicket] = useState<string | null>(null);

  async function createTicket(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    setFields({});

    const response = await fetch('/api/support', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject: String(form.get('subject') ?? ''),
        category: String(form.get('category') ?? 'other'),
        description: String(form.get('description') ?? ''),
        priority: String(form.get('priority') ?? 'normal'),
      }),
    });

    const data = await response.json().catch(() => ({}));
    setPending(false);

    if (!response.ok) {
      setError(data.error ?? 'Could not open that ticket.');
      setFields(data.fields ?? {});
      return;
    }

    setOpen(false);
    router.refresh();
  }

  async function reply(ticketId: string, event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);

    const response = await fetch(`/api/support/${ticketId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: String(form.get('body') ?? ''), is_internal: false }),
    });

    setPending(false);
    if (!response.ok) {
      setError('Could not post that reply.');
      return;
    }
    (event.target as HTMLFormElement).reset();
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {error ? <Alert tone="danger">{error}</Alert> : null}

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Support</h2>
        <Button variant={open ? 'ghost' : 'primary'} size="sm" onClick={() => setOpen((v) => !v)}>
          {open ? 'Cancel' : 'New ticket'}
        </Button>
      </div>

      {open ? (
        <Card className="p-6">
          <form onSubmit={createTicket} className="space-y-4">
            <Field label="Subject" htmlFor="subject" required error={fields.subject}>
              <Input id="subject" name="subject" required maxLength={160} />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Category" htmlFor="category">
                <Select id="category" name="category" defaultValue="technical_support">
                  {TICKET_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {TICKET_CATEGORY_LABELS[category]}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Priority" htmlFor="priority">
                <Select id="priority" name="priority" defaultValue="normal">
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </Select>
              </Field>
            </div>

            <Field
              label="What is happening?"
              htmlFor="description"
              required
              error={fields.description}
              hint="Include your order number if this is about an order, and anything you have already tried."
            >
              <Textarea id="description" name="description" rows={6} required />
            </Field>

            <Button type="submit" disabled={pending}>
              {pending ? 'Opening...' : 'Open ticket'}
            </Button>
          </form>
        </Card>
      ) : null}

      {tickets.length === 0 && !open ? (
        <p className="text-sm text-ink-400">No tickets yet.</p>
      ) : null}

      {tickets.map((ticket) => {
        const thread = messages[ticket.id] ?? [];
        const isActive = activeTicket === ticket.id;
        return (
          <Card key={ticket.id}>
            <CardHeader
              title={
                <span className="flex flex-wrap items-center gap-2 normal-case">
                  <span className="text-base">{ticket.subject}</span>
                  <TicketStatusBadge status={ticket.status} />
                </span>
              }
              description={`${ticket.reference} · ${TICKET_CATEGORY_LABELS[ticket.category]} · opened ${formatDateTime(ticket.created_at)}`}
              action={
                <button
                  type="button"
                  onClick={() => setActiveTicket(isActive ? null : ticket.id)}
                  className="text-sm text-maple-400 hover:text-maple-300"
                  aria-expanded={isActive}
                >
                  {isActive ? 'Hide' : `Open (${thread.length + 1})`}
                </button>
              }
            />

            {isActive ? (
              <div className="space-y-4 px-5 py-4">
                <Message
                  author="You"
                  at={ticket.created_at}
                  body={ticket.description}
                  mine
                />
                {thread.map((message) => (
                  <Message
                    key={message.id}
                    author={message.author_role === 'admin' ? 'PC Builders Canada' : 'You'}
                    at={message.created_at}
                    body={message.body}
                    mine={message.author_role !== 'admin'}
                  />
                ))}

                {ticket.status !== 'closed' ? (
                  <form onSubmit={(e) => reply(ticket.id, e)} className="border-t border-ink-700 pt-4">
                    <Field label="Reply" htmlFor={`reply-${ticket.id}`}>
                      <Textarea id={`reply-${ticket.id}`} name="body" rows={3} required />
                    </Field>
                    <Button type="submit" size="sm" className="mt-3" disabled={pending}>
                      Send reply
                    </Button>
                  </form>
                ) : (
                  <p className="border-t border-ink-700 pt-4 text-sm text-ink-400">
                    This ticket is closed. Open a new one if the problem comes back.
                  </p>
                )}
              </div>
            ) : null}
          </Card>
        );
      })}
    </div>
  );
}

function Message({
  author,
  at,
  body,
  mine,
}: {
  author: string;
  at: string;
  body: string;
  mine: boolean;
}) {
  return (
    <div className={mine ? '' : 'rounded-md border border-ink-700 bg-ink-900 p-3'}>
      <p className="text-xs text-ink-400">
        <span className={mine ? 'text-ink-300' : 'font-medium text-maple-400'}>{author}</span> ·{' '}
        {formatDateTime(at)}
      </p>
      <p className="mt-1 text-sm leading-relaxed whitespace-pre-wrap text-ink-200">{body}</p>
    </div>
  );
}
