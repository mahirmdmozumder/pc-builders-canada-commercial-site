import { z } from 'zod';
import { COMPONENT_CATEGORIES, COMPONENT_CONDITIONS } from '@/lib/catalog/types';
import {
  CONTENT_STATUSES,
  PRESET_AUDIENCES,
  PROMOTION_PLACEMENTS,
} from '@/lib/cms/types';
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
  data_confidence: z.enum(['sample', 'verified']).default('sample'),
  /**
   * `active` is still accepted from older callers, but `status` is what gets
   * written. A trigger in migration 0006 derives one from the other, so
   * sending both cannot produce an inconsistent row.
   */
  active: z.boolean().optional(),
  status: z.enum(CONTENT_STATUSES).optional(),
  featured: z.boolean().optional(),
  sort_order: z.number().int().min(0).max(100_000).optional(),
  short_description: z.string().trim().max(400).nullable().optional(),
  gallery_urls: z.array(z.string().trim().max(600)).max(12).optional(),
  seo_title: z.string().trim().max(120).nullable().optional(),
  seo_description: z.string().trim().max(320).nullable().optional(),
  condition: z.enum(COMPONENT_CONDITIONS).default('new'),

  /**
   * Display-only extras. Free-form on purpose: a new specification must never
   * need a migration. No compatibility rule reads this bag, which is why the
   * typed columns below exist separately.
   */
  specs: z
    .record(z.string().min(1).max(60), z.union([z.string().max(2000), z.number(), z.boolean()]))
    .optional(),

  // --- compatibility columns -------------------------------------------
  // Real columns because the engine COMPARES them. A socket stored as free
  // text in `specs` is a socket the engine cannot check.
  socket: z.string().trim().max(40).nullable().optional(),
  supported_sockets: z.array(z.string().trim().max(40)).max(40).nullable().optional(),
  chipset: z.string().trim().max(60).nullable().optional(),
  memory_slots: z.number().int().min(0).max(32).nullable().optional(),
  max_memory_gb: z.number().int().min(0).max(8192).nullable().optional(),
  m2_slots: z.number().int().min(0).max(16).nullable().optional(),
  sata_ports: z.number().int().min(0).max(32).nullable().optional(),
  form_factor: z.enum(['e-atx', 'atx', 'micro-atx', 'mini-itx']).nullable().optional(),
  supported_form_factors: z
    .array(z.enum(['e-atx', 'atx', 'micro-atx', 'mini-itx']))
    .max(8)
    .nullable()
    .optional(),
  memory_type: z.enum(['ddr4', 'ddr5']).nullable().optional(),
  memory_capacity_gb: z.number().int().min(0).max(8192).nullable().optional(),
  memory_modules: z.number().int().min(0).max(16).nullable().optional(),
  memory_speed_mts: z.number().int().min(0).max(20000).nullable().optional(),
  tdp_watts: z.number().int().min(0).max(2000).nullable().optional(),
  recommended_psu_watts: z.number().int().min(0).max(5000).nullable().optional(),
  psu_wattage: z.number().int().min(0).max(5000).nullable().optional(),
  psu_efficiency: z.string().trim().max(40).nullable().optional(),
  psu_form_factor: z.enum(['atx', 'sfx', 'sfx-l']).nullable().optional(),
  gpu_length_mm: z.number().int().min(0).max(1000).nullable().optional(),
  max_gpu_length_mm: z.number().int().min(0).max(1000).nullable().optional(),
  cooler_height_mm: z.number().int().min(0).max(400).nullable().optional(),
  max_cooler_height_mm: z.number().int().min(0).max(400).nullable().optional(),
  radiator_support_mm: z.array(z.number().int().min(0).max(1000)).max(10).nullable().optional(),
  radiator_size_mm: z.array(z.number().int().min(0).max(1000)).max(10).nullable().optional(),
  cooler_type: z.enum(['air', 'aio']).nullable().optional(),
  cooling_capacity_watts: z.number().int().min(0).max(2000).nullable().optional(),
  storage_interface: z.enum(['nvme-m2', 'sata']).nullable().optional(),
  storage_capacity_gb: z.number().int().min(0).max(1_000_000).nullable().optional(),
  pcie_version: z.number().int().min(1).max(6).nullable().optional(),
  condition_notes: z.string().trim().max(600).nullable().optional(),
  image_url: z.url().max(500).nullable().optional().or(z.literal('')),
  /**
   * One optional product video.
   *
   * Validated as a URL rather than as a storage path, because the two things an
   * operator actually has are a YouTube link and an uploaded clip. Which of
   * those a URL is gets decided at render time by describeVideo(); a link this
   * accepts but that renderer does not recognise simply shows no video, rather
   * than an empty player.
   */
  video_url: z.url().max(600).nullable().optional().or(z.literal('')),
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

/**
 * A price change made from the pricing screen.
 *
 * Deliberately the same shape as the inventory adjustment above: one component,
 * one new value, an optional reason. Component prices move often enough that
 * editing them through the full product form is the wrong tool, exactly as it is
 * for counting stock.
 *
 * `price_cents` carries the same bounds as the product editor's own field, so a
 * figure this route accepts is a figure that form would accept. Cents, integer:
 * the screen takes dollars and converts, because money stored as a float is a
 * rounding bug waiting for a total.
 */
export const priceUpdateSchema = z.object({
  component_id: z.string().min(1).max(120),
  price_cents: z.number().int().min(0).max(100_000_00),
  reason: z.string().trim().max(200).optional(),
});

// ---------------------------------------------------------------------------
// Product reviews
// ---------------------------------------------------------------------------

/**
 * A customer review.
 *
 * Every limit here matches a CHECK constraint in migration 0009, deliberately.
 * This layer produces a readable message for a person filling in a form; the
 * database is what actually enforces the rule, including against SQL run by
 * hand.
 *
 * Note what is ABSENT and cannot be sent: `user_id`, `verified_purchase`,
 * `hidden_at` and `hidden_reason`. Authorship and verification are established
 * by the database trigger from the session and from paid order data. A schema
 * that accepted them would be accepting a client's claim about who it is and
 * what it bought.
 */
const reviewBodyField = z
  .string()
  .trim()
  // 20 characters is roughly "Works great, no issues" — short, but a statement.
  // Below that a review carries a rating and no information.
  .min(20, 'Please write at least 20 characters so the review says something.')
  .max(4000);

export const reviewSchema = z.object({
  component_id: z.string().trim().min(1).max(120),
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().min(3).max(120).nullable().optional().or(z.literal('')),
  body: reviewBodyField,
  display_name: z
    .string()
    .trim()
    .min(2, 'Give a name to show on the review.')
    .max(60),
});

/** Revising a review: the same rules, minus the product, which cannot move. */
export const reviewEditSchema = reviewSchema.omit({ component_id: true }).partial();

/**
 * Hiding or unhiding a review, the only review write an admin may make.
 *
 * `hidden: true` requires a reason, and the reason is stored. An unexplained
 * removal is indistinguishable from suppressing a bad review, and the database
 * constraint refuses one anyway.
 *
 * There is no field here for the rating, the title or the body. The seller does
 * not get to edit what a customer wrote — see the trigger in migration 0009,
 * which discards those columns on an admin update rather than trusting this
 * schema to have left them out.
 */
export const reviewModerationSchema = z
  .object({
    hidden: z.boolean(),
    reason: z.string().trim().max(300).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.hidden && (value.reason ?? '').trim().length < 5) {
      ctx.addIssue({
        code: 'custom',
        path: ['reason'],
        message: 'Say why it is being hidden. It is recorded against the review.',
      });
    }
  });

export type ReviewInput = z.infer<typeof reviewSchema>;
export type ReviewEditInput = z.infer<typeof reviewEditSchema>;

export type SaveBuildInput = z.infer<typeof saveBuildSchema>;
export type QuoteInput = z.infer<typeof quoteSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type TicketInput = z.infer<typeof ticketSchema>;

// ---------------------------------------------------------------------------
// Content management
// ---------------------------------------------------------------------------

/**
 * Fields shared by every editable content record.
 *
 * Kept as a plain object rather than a schema so each collection can spread it
 * and still call .partial() for its PATCH route. Zod refuses .partial() on a
 * schema carrying a refinement, which is the same trap the component schema
 * fell into.
 */
const contentFields = {
  status: z.enum(CONTENT_STATUSES).default('draft'),
  featured: z.boolean().default(false),
  sort_order: z.number().int().min(0).max(100_000).default(0),
  seo_title: z.string().trim().max(120).nullable().optional(),
  seo_description: z.string().trim().max(320).nullable().optional(),
};

const slug = z
  .string()
  .trim()
  .min(2)
  .max(120)
  .regex(/^[a-z0-9-]+$/, 'Use lowercase letters, numbers and hyphens.');

/** An uploaded or pasted image URL. Empty string means "cleared". */
const imageUrl = z.string().trim().max(600).nullable().optional();

export const adminServiceFields = z.object({
  id: slug,
  slug,
  name: z.string().trim().min(2).max(160),
  short_description: z.string().trim().min(10, 'Say what the service is in a sentence.').max(400),
  description: z.string().trim().max(6000).nullable().optional(),
  includes: z.array(z.string().trim().min(2).max(300)).max(20).default([]),
  note: z.string().trim().max(1000).nullable().optional(),
  price_text: z.string().trim().max(120).nullable().optional(),
  image_url: imageUrl,
  icon: z.string().trim().max(60).nullable().optional(),
  /**
   * Minimum lengths mirror the database check constraint in 0008. A one-word
   * answer is not an answer, and it would reach Google as structured data.
   */
  faqs: z
    .array(
      z.object({
        question: z.string().trim().min(5).max(300),
        answer: z.string().trim().min(20).max(2000),
      }),
    )
    .max(12)
    .default([]),
  ...contentFields,
});
export const adminServiceSchema = adminServiceFields;
export const adminServiceEditSchema = adminServiceFields.partial().omit({ id: true });

export const adminPresetFields = z.object({
  id: slug,
  slug,
  name: z.string().trim().min(2).max(160),
  audience: z.enum(PRESET_AUDIENCES).default('gaming'),
  tagline: z.string().trim().max(300).default(''),
  rationale: z.string().trim().max(4000).default(''),
  highlights: z.array(z.string().trim().min(2).max(300)).max(12).default([]),
  items: z
    .array(
      z.object({
        category: z.enum(COMPONENT_CATEGORIES),
        component_id: z.string().trim().min(1).max(120),
        quantity: z.number().int().min(1).max(20).default(1),
      }),
    )
    .max(30)
    .default([]),
  hero_image_url: imageUrl,
  gallery_urls: z.array(z.string().trim().max(600)).max(12).default([]),
  ...contentFields,
});
export const adminPresetSchema = adminPresetFields;
export const adminPresetEditSchema = adminPresetFields.partial().omit({ id: true });

export const adminPortfolioFields = z.object({
  slug,
  title: z.string().trim().min(2).max(200),
  purpose: z.string().trim().min(2).max(160),
  summary: z.string().trim().min(10, 'Summarise the build in a sentence.').max(600),
  short_description: z.string().trim().max(300).nullable().optional(),
  body: z.string().trim().max(20_000).nullable().optional(),
  items: z
    .array(
      z.object({
        category: z.enum(COMPONENT_CATEGORIES),
        component_id: z.string().trim().min(1).max(120),
        quantity: z.number().int().min(1).max(20).default(1),
      }),
    )
    .max(40)
    .default([]),
  component_notes: z.array(z.string().trim().min(2).max(300)).max(40).default([]),
  hero_image_url: imageUrl,
  image_urls: z.array(z.string().trim().max(600)).max(24).default([]),
  /**
   * Only filled in when performance was actually measured on the machine.
   * The schema cannot enforce honesty, but the field is named so that writing
   * something unmeasured here is a deliberate act rather than an accident.
   */
  verified_performance_notes: z.string().trim().max(4000).nullable().optional(),
  customer_type: z.string().trim().max(120).nullable().optional(),
  completed_on: z.string().trim().max(40).nullable().optional(),
  ...contentFields,
});
export const adminPortfolioSchema = adminPortfolioFields;
export const adminPortfolioEditSchema = adminPortfolioFields.partial();

export const adminPromotionFields = z.object({
  title: z.string().trim().min(2).max(200),
  subtitle: z.string().trim().max(300).nullable().optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  image_url: imageUrl,
  button_text: z.string().trim().max(60).nullable().optional(),
  button_url: z.string().trim().max(600).nullable().optional(),
  starts_at: z.string().trim().max(40).nullable().optional(),
  ends_at: z.string().trim().max(40).nullable().optional(),
  placement: z.enum(PROMOTION_PLACEMENTS).default('home-hero'),
  status: z.enum(CONTENT_STATUSES).default('draft'),
  sort_order: z.number().int().min(0).max(100_000).default(0),
});
export const adminPromotionSchema = adminPromotionFields.superRefine((value, ctx) => {
  if (value.starts_at && value.ends_at && new Date(value.ends_at) <= new Date(value.starts_at)) {
    ctx.addIssue({
      code: 'custom',
      path: ['ends_at'],
      message: 'The end date has to be after the start date.',
    });
  }
  if (value.button_text && !value.button_url) {
    ctx.addIssue({
      code: 'custom',
      path: ['button_url'],
      message: 'A button with no link does nothing. Add a URL or clear the button text.',
    });
  }
});
export const adminPromotionEditSchema = adminPromotionFields.partial();

export const adminCategorySchema = z.object({
  label: z.string().trim().min(2).max(80),
  description: z.string().trim().max(1000).nullable().optional(),
  image_url: imageUrl,
  sort_order: z.number().int().min(0).max(100_000).default(0),
  active: z.boolean().default(true),
  seo_title: z.string().trim().max(120).nullable().optional(),
  seo_description: z.string().trim().max(320).nullable().optional(),
});
