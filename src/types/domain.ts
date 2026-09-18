import type { ComponentCategory } from '@/lib/catalog/types';

export type UserRole = 'customer' | 'admin';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Builds
// ---------------------------------------------------------------------------

export interface SavedBuildItem {
  category: ComponentCategory;
  component_id: string;
  quantity: number;
}

export interface SavedBuild {
  id: string;
  user_id: string;
  name: string;
  notes: string | null;
  items: SavedBuildItem[];
  /** Snapshot of the estimate at save time, in cents. Recomputed on load. */
  estimated_total_cents: number;
  is_compatible: boolean;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Quotes
// ---------------------------------------------------------------------------

export const QUOTE_STATUSES = [
  'new',
  'reviewing',
  'quoted',
  'approved',
  'declined',
  'converted',
] as const;
export type QuoteStatus = (typeof QUOTE_STATUSES)[number];

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  new: 'New',
  reviewing: 'Reviewing',
  quoted: 'Quoted',
  approved: 'Approved',
  declined: 'Declined',
  converted: 'Converted to order',
};

export type ContactMethod = 'email' | 'phone';

export interface Quote {
  id: string;
  reference: string;
  user_id: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  preferred_contact: ContactMethod;
  province: string | null;
  build_name: string | null;
  items: SavedBuildItem[];
  /** Server-recomputed estimate at submission, cents. */
  estimated_total_cents: number;
  customer_notes: string | null;
  /** Internal only — never returned by customer-facing endpoints. */
  internal_notes: string | null;
  quoted_total_cents: number | null;
  status: QuoteStatus;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

export const ORDER_STATUSES = [
  'pending',
  'confirmed',
  'processing',
  'building',
  'testing',
  'ready',
  'shipped',
  'completed',
  'cancelled',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  processing: 'Processing',
  building: 'Building',
  testing: 'Testing',
  ready: 'Ready',
  shipped: 'Shipped',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

/** Progression shown on the customer-facing status timeline. */
export const ORDER_STATUS_FLOW: OrderStatus[] = [
  'pending',
  'confirmed',
  'processing',
  'building',
  'testing',
  'ready',
  'shipped',
  'completed',
];

export const PAYMENT_STATUSES = ['pending', 'paid', 'failed', 'refunded', 'cancelled'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'Pending',
  paid: 'Paid',
  failed: 'Failed',
  refunded: 'Refunded',
  cancelled: 'Cancelled',
};

export type OrderItemKind = 'build' | 'component' | 'service';

export interface OrderItem {
  id: string;
  order_id: string;
  kind: OrderItemKind;
  name: string;
  /** Immutable snapshot of what was purchased. */
  configuration: SavedBuildItem[] | null;
  component_id: string | null;
  quantity: number;
  unit_price_cents: number;
  total_cents: number;
}

export interface ShippingAddress {
  line1: string;
  line2?: string | null;
  city: string;
  province: string;
  postal_code: string;
  country: string;
}

export interface TaxLine {
  label: string;
  rate: number;
  amount_cents: number;
}

export interface Order {
  id: string;
  order_number: string;
  user_id: string | null;
  customer_email: string;
  customer_name: string | null;
  shipping_address: ShippingAddress | null;
  province: string;
  subtotal_cents: number;
  assembly_fee_cents: number;
  shipping_cents: number;
  tax_cents: number;
  total_cents: number;
  tax_breakdown: TaxLine[];
  status: OrderStatus;
  payment_status: PaymentStatus;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
}

// ---------------------------------------------------------------------------
// Support tickets
// ---------------------------------------------------------------------------

export const TICKET_STATUSES = [
  'open',
  'in_progress',
  'waiting_customer',
  'resolved',
  'closed',
] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  open: 'Open',
  in_progress: 'In progress',
  waiting_customer: 'Waiting for customer',
  resolved: 'Resolved',
  closed: 'Closed',
};

export const TICKET_PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

export const TICKET_CATEGORIES = [
  'order',
  'hardware',
  'warranty',
  'technical_support',
  'billing',
  'other',
] as const;
export type TicketCategory = (typeof TICKET_CATEGORIES)[number];

export const TICKET_CATEGORY_LABELS: Record<TicketCategory, string> = {
  order: 'Order question',
  hardware: 'Hardware issue',
  warranty: 'Warranty / RMA',
  technical_support: 'Technical support',
  billing: 'Billing',
  other: 'Other',
};

export interface SupportTicket {
  id: string;
  reference: string;
  user_id: string | null;
  customer_email: string;
  customer_name: string | null;
  subject: string;
  category: TicketCategory;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  order_id: string | null;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface TicketMessage {
  id: string;
  ticket_id: string;
  author_id: string | null;
  author_role: UserRole;
  body: string;
  /** Internal notes are filtered out server-side for customer requests. */
  is_internal: boolean;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Admin activity log
// ---------------------------------------------------------------------------

export type ActivityAction =
  | 'order.status_changed'
  | 'order.note_added'
  | 'component.created'
  | 'component.updated'
  | 'component.deactivated'
  | 'inventory.adjusted'
  | 'quote.status_changed'
  | 'quote.note_added'
  | 'ticket.status_changed'
  | 'ticket.replied'
  | 'portfolio.updated';

export interface ActivityLogEntry {
  id: string;
  actor_id: string | null;
  actor_email: string | null;
  action: ActivityAction;
  entity_type: string;
  entity_id: string | null;
  summary: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Portfolio
// ---------------------------------------------------------------------------

export interface PortfolioBuild {
  id: string;
  slug: string;
  title: string;
  purpose: string;
  summary: string;
  body: string | null;
  items: SavedBuildItem[];
  /** Free-text component list for builds not tied to catalogue rows. */
  component_notes: string[] | null;
  image_urls: string[];
  /** Populated only when the operator has actually measured it. */
  verified_performance_notes: string | null;
  published: boolean;
  created_at: string;
  updated_at: string;
}
