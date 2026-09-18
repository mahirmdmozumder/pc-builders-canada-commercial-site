import { Badge } from '@/components/ui';
import {
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  QUOTE_STATUS_LABELS,
  TICKET_STATUS_LABELS,
  type OrderStatus,
  type PaymentStatus,
  type QuoteStatus,
  type TicketStatus,
} from '@/types/domain';

type Tone = 'neutral' | 'ok' | 'warn' | 'danger' | 'info' | 'accent';

const ORDER_TONES: Record<OrderStatus, Tone> = {
  pending: 'neutral',
  confirmed: 'info',
  processing: 'info',
  building: 'accent',
  testing: 'accent',
  ready: 'ok',
  shipped: 'ok',
  completed: 'ok',
  cancelled: 'danger',
};

const PAYMENT_TONES: Record<PaymentStatus, Tone> = {
  pending: 'warn',
  paid: 'ok',
  failed: 'danger',
  refunded: 'info',
  cancelled: 'neutral',
};

const QUOTE_TONES: Record<QuoteStatus, Tone> = {
  new: 'info',
  reviewing: 'accent',
  quoted: 'accent',
  approved: 'ok',
  declined: 'neutral',
  converted: 'ok',
};

const TICKET_TONES: Record<TicketStatus, Tone> = {
  open: 'info',
  in_progress: 'accent',
  waiting_customer: 'warn',
  resolved: 'ok',
  closed: 'neutral',
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge tone={ORDER_TONES[status]}>{ORDER_STATUS_LABELS[status]}</Badge>;
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return <Badge tone={PAYMENT_TONES[status]}>{PAYMENT_STATUS_LABELS[status]}</Badge>;
}

export function QuoteStatusBadge({ status }: { status: QuoteStatus }) {
  return <Badge tone={QUOTE_TONES[status]}>{QUOTE_STATUS_LABELS[status]}</Badge>;
}

export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  return <Badge tone={TICKET_TONES[status]}>{TICKET_STATUS_LABELS[status]}</Badge>;
}
