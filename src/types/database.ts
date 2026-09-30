import type { ComponentRecord } from '@/lib/catalog/types';
import type {
  BuildPresetRecord,
  CategoryMeta,
  PromotionRecord,
  PublicPromotion,
  ServiceRecord,
} from '@/lib/cms/types';
import type { PublicReview, ReviewStats } from '@/lib/reviews/types';
import type {
  ActivityLogEntry,
  Order,
  OrderItem,
  PortfolioBuild,
  Profile,
  Quote,
  SavedBuild,
  SupportTicket,
  TicketMessage,
} from '@/types/domain';

/**
 * Database shape for the Supabase client generic.
 *
 * Hand-written rather than generated, and derived from the domain types so
 * there is one definition of a row in the codebase. The trade-off is that a
 * migration has to be reflected here by hand; the payoff is that a typo in a
 * column name fails `tsc` instead of failing in production.
 *
 * To regenerate from a live database instead:
 *   npx supabase gen types typescript --project-id <id> > src/types/database.ts
 */

/**
 * Flattens an interface into an anonymous object type.
 *
 * Needed because Supabase constrains every row to `Record<string, unknown>`,
 * and a TypeScript *interface* has no implicit index signature, so it fails
 * that constraint and the client falls back to `never` on every insert. A
 * mapped type does carry one.
 */
type Simplify<T> = { [K in keyof T]: T[K] };

/**
 * Insert shape: every column optional.
 *
 * Postgres fills defaults (ids, timestamps) and accepts nulls for nullable
 * columns, so requiring them here would reject valid inserts. Column NAMES
 * are still checked — the client rejects excess properties — so a typo in a
 * column still fails at compile time, which is the protection that matters.
 */
type Insert<T> = Simplify<Partial<T>>;

interface Table<Row, I = Insert<Row>, U = Partial<I>> {
  Row: Simplify<Row>;
  Insert: I;
  Update: U;
  /**
   * Foreign-key metadata, used by the client to type embedded selects. Left
   * empty: this codebase reads related rows with explicit queries rather than
   * PostgREST embedding, so there is nothing for it to infer.
   */
  Relationships: [];
}

/**
 * The product_reviews row, as the table holds it.
 *
 * Defined here rather than in lib/reviews/types.ts because that module describes
 * what the STOREFRONT sees — and the difference between the two is the point. The
 * moderation columns and the author's user id exist on the row and are absent
 * from the public view.
 */
interface ReviewRow {
  id: string;
  component_id: string;
  user_id: string;
  rating: number;
  title: string | null;
  body: string;
  display_name: string;
  /** Written by a database trigger from paid order data, never by a client. */
  verified_purchase: boolean;
  hidden_at: string | null;
  hidden_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string | null;
  message: string;
  handled: boolean;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: Table<Profile>;
      components: Table<ComponentRecord>;
      saved_builds: Table<SavedBuild>;
      quotes: Table<Quote>;
      orders: Table<Omit<Order, 'items'>>;
      order_items: Table<OrderItem>;
      support_tickets: Table<SupportTicket>;
      ticket_messages: Table<TicketMessage>;
      activity_log: Table<ActivityLogEntry>;
      portfolio_builds: Table<PortfolioBuild>;
      contact_messages: Table<ContactMessage>;
      component_categories: Table<CategoryMeta>;
      services: Table<ServiceRecord>;
      build_presets: Table<BuildPresetRecord>;
      promotions: Table<PromotionRecord>;
      /**
       * Customer reviews. The storefront never reads this table — it reads the
       * two views below, neither of which contains user_id. Only the author's own
       * account page and the admin moderation queue read the row itself, and RLS
       * is what scopes each of those. See migration 0009.
       */
      product_reviews: Table<ReviewRow>;
    };
    Views: {
      /**
       * Public catalogue projection: every column except cost_cents. Anonymous
       * and signed-in visitors read this; only admins read the table.
       */
      components_public: {
        Relationships: [];
        Row: Simplify<Omit<ComponentRecord, 'cost_cents'>>;
      };
      /** Promotions already filtered by publish state AND schedule window. */
      promotions_public: {
        Relationships: [];
        Row: Simplify<PublicPromotion>;
      };
      /**
       * Visible reviews, without user_id. This is what anonymous and signed-in
       * visitors read.
       */
      product_reviews_public: {
        Relationships: [];
        Row: Simplify<PublicReview>;
      };
      /**
       * The rating aggregate, computed by Postgres over every visible review.
       *
       * A product with no visible reviews has NO ROW here rather than a row of
       * zeroes, which is why every consumer types this as possibly absent.
       */
      product_review_stats: {
        Relationships: [];
        Row: Simplify<ReviewStats>;
      };
      low_stock_components: {
        Relationships: [];
        Row: Simplify<Pick<
          ComponentRecord,
          | 'id'
          | 'sku'
          | 'category'
          | 'brand'
          | 'model'
          | 'stock_quantity'
          | 'low_stock_threshold'
          | 'price_cents'
        >>;
      };
    };
    Functions: {
      apply_order_stock: {
        Args: { p_order_id: string };
        Returns: { component_id: string; requested: number; applied: number }[];
      };
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
