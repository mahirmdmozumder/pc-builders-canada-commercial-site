import { z } from 'zod';
import { COMPONENT_CATEGORIES, COMPONENT_CONDITIONS } from '@/lib/catalog/types';
import { TICKET_CATEGORIES, TICKET_PRIORITIES } from '@/types/domain';
import { PROVINCE_TAXES } from '@/lib/pricing/tax';

/**
 * Every request body crossing the network is parsed through one of these.
 *
 * The important property: nothing a client sends about MONEY is trusted.
 * There is no price field in any of these schemas. Prices are always looked
 * up from the catalogue server-side and recalculated by the pricing engine.
 */

/**
 * Who sent this customer, for the referral offer.
 *
 * Free text on purpose. The offer asks people to name whoever referred them,
 * and a name, a phone number or "the guy who fixed my PC in June" are all
 * things a real person types. A strict code format would reject most of them
 * and quietly lose the referral the offer exists to capture.
 */
const referralField = z.string().trim().max(120).nullable().optional();

export const buildItemSchema = z.object({
  category: z.enum(COMPONENT_CATEGORIES),
  component_id: z.string().min(1).max(120),
  quantity: z.number().int().min(1).max(20),
});

export const buildItemsSchema = z
  .array(buildItemSchema)
  .min(1, 'Select at least one component.')
  .max(30, 'That is more parts than a single build supports.');

export const saveBuildSchema = z.object({
  name: z.string().trim().min(1, 'Give this build a name.').max(80),
  notes: z.string().trim().max(2000).nullable().optional(),
  items: buildItemsSchema,
});

export const updateBuildSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  items: buildItemsSchema.optional(),
});

const provinceCodes = Object.keys(PROVINCE_TAXES) as [string, ...string[]];

export const quoteSchema = z
  .object({
    customer_name: z.string().trim().min(2, 'Tell us your name.').max(120),
    customer_email: z.email('Enter a valid email address.').max(160),
    customer_phone: z.string().trim().max(40).nullable().optional(),
    preferred_contact: z.enum(['email', 'phone']).default('email'),
    province: z.enum(provinceCodes).nullable().optional(),
    build_name: z.string().trim().max(80).nullable().optional(),
    /** May be empty when the customer is describing what they want in words. */
    items: z.array(buildItemSchema).max(30),
    customer_notes: z.string().trim().max(4000).nullable().optional(),
    referred_by: referralField,
  })
  .superRefine((value, ctx) => {
    // A quote needs something to quote on: either a configuration or a
    // description. Requiring both would turn away the customer who just
    // wants to say "a machine for video editing, about $2,500".
    if (value.items.length === 0 && (value.customer_notes ?? '').trim().length < 20) {
      ctx.addIssue({
        code: 'custom',
        path: ['customer_notes'],
        message: 'Attach a build or describe what you need in a sentence or two.',
      });
    }
    if (value.preferred_contact === 'phone' && !(value.customer_phone ?? '').trim()) {
      ctx.addIssue({
        code: 'custom',
        path: ['customer_phone'],
        message: 'Add a phone number so we can reach you.',
      });
    }
  });

export const contactSchema = z.object({
  name: z.string().trim().min(2, 'Tell us your name.').max(120),
  email: z.email('Enter a valid email address.').max(160),
  phone: z.string().trim().max(40).nullable().optional(),
  subject: z.string().trim().max(160).nullable().optional(),
  message: z.string().trim().min(10, 'Add a little more detail.').max(4000),
  referred_by: referralField,
});

export const ticketSchema = z.object({
  subject: z.string().trim().min(4, 'Give the ticket a subject.').max(160),
  category: z.enum(TICKET_CATEGORIES),
  description: z.string().trim().min(10, 'Describe the problem in a bit more detail.').max(6000),
  priority: z.enum(TICKET_PRIORITIES).default('normal'),
  order_id: z.uuid().nullable().optional(),
});

export const ticketReplySchema = z.object({
  body: z.string().trim().min(1, 'Write a reply.').max(6000),
  is_internal: z.boolean().default(false),
});

export const checkoutLineSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('build'),
    name: z.string().trim().min(1).max(120),
    items: buildItemsSchema,
    quantity: z.number().int().min(1).max(5),
  }),
  z.object({
    kind: z.literal('component'),
    component_id: z.string().min(1).max(120),
    quantity: z.number().int().min(1).max(20),
  }),
]);

export const checkoutSchema = z.object({
  lines: z.array(checkoutLineSchema).min(1, 'Your cart is empty.').max(20),
  province: z.enum(provinceCodes),
  email: z.email('Enter a valid email address.').max(160),
  name: z.string().trim().max(120).nullable().optional(),
});

export const adminOrderUpdateSchema = z.object({
  status: z
    .enum([
      'pending',
      'confirmed',
      'processing',
      'building',
      'testing',
      'ready',
      'shipped',
      'completed',
      'cancelled',
    ])
    .optional(),
  internal_notes: z.string().trim().max(6000).nullable().optional(),
});

export const adminQuoteUpdateSchema = z.object({
  status: z.enum(['new', 'reviewing', 'quoted', 'approved', 'declined', 'converted']).optional(),
  internal_notes: z.string().trim().max(6000).nullable().optional(),
  quoted_total_cents: z.number().int().min(0).max(100_000_00).nullable().optional(),
});

export const adminTicketUpdateSchema = z.object({
  status: z.enum(['open', 'in_progress', 'waiting_customer', 'resolved', 'closed']).optional(),
  priority: z.enum(TICKET_PRIORITIES).optional(),
  internal_notes: z.string().trim().max(6000).nullable().optional(),
});

/**
 * Notes are mandatory on anything not sold as new.
 *
 * This mirrors the check constraint in migration 0004 rather than trusting it.
 * Validating here as well means the admin gets a field-level error against the
 * right input, instead of a raw Postgres constraint violation.
 */
const CONDITION_NOTES_MESSAGE =
  'Say what was done to this unit and what warranty it carries. A buyer paying less is entitled to know why.';

/**
 * Admin component editor. Money arrives as cents and is validated as such.
 *
 * Kept as a PLAIN object schema with no refinement attached, because Zod
 * refuses `.partial()` on a schema that carries one, and the PATCH route needs
 * a partial version of this for partial updates. The condition rule is applied
 * by the exported schemas below instead.
 */
export const adminComponentFields = z.object({
  id: z.string().trim().min(2).max(120).regex(/^[a-z0-9-]+$/, 'Use lowercase letters, numbers and hyphens.'),
  sku: z.string().trim().min(2).max(60),
  category: z.enum(COMPONENT_CATEGORIES),
  brand: z.string().trim().min(1).max(80),
  model: z.string().trim().min(1).max(160),
  description: z.string().trim().max(2000).default(''),
  price_cents: z.number().int().min(0).max(100_000_00),
  cost_cents: z.number().int().min(0).max(100_000_00).nullable().optional(),
  stock_quantity: z.number().int().min(0).max(100_000),
  low_stock_threshold: z.number().int().min(0).max(1000),
  active: z.boolean().default(true),
  data_confidence: z.enum(['sample', 'verified']).default('sample'),
  condition: z.enum(COMPONENT_CONDITIONS).default('new'),
  condition_notes: z.string().trim().max(600).nullable().optional(),
  image_url: z.url().max(500).nullable().optional().or(z.literal('')),
});

/** Creating a component: every field present, condition rule enforced. */
export const adminComponentSchema = adminComponentFields.superRefine((value, ctx) => {
  if (value.condition !== 'new' && (value.condition_notes ?? '').trim().length < 10) {
    ctx.addIssue({ code: 'custom', path: ['condition_notes'], message: CONDITION_NOTES_MESSAGE });
  }
});

/**
 * Editing a component: every field optional, and the id is not editable.
 *
 * The condition rule can only be applied when the patch actually MOVES the
 * condition away from new. A patch that touches neither field says nothing
 * about condition and must not be rejected, and a patch that changes only the
 * notes cannot be judged here because the stored condition is not in the
 * payload. The database check constraint from migration 0004 remains the
 * backstop for both of those cases, which is the correct place for a rule
 * about the row as a whole.
 */
export const adminComponentEditSchema = adminComponentFields
  .partial()
  .omit({ id: true })
  .superRefine((value, ctx) => {
    if (
      value.condition !== undefined &&
      value.condition !== 'new' &&
      (value.condition_notes ?? '').trim().length < 10
    ) {
      ctx.addIssue({ code: 'custom', path: ['condition_notes'], message: CONDITION_NOTES_MESSAGE });
    }
  });

export const inventoryAdjustSchema = z.object({
  component_id: z.string().min(1).max(120),
  stock_quantity: z.number().int().min(0).max(100_000),
  reason: z.string().trim().max(200).optional(),
});

export type SaveBuildInput = z.infer<typeof saveBuildSchema>;
export type QuoteInput = z.infer<typeof quoteSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type TicketInput = z.infer<typeof ticketSchema>;
