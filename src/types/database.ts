import type { ComponentRecord } from '@/lib/catalog/types';
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
    };
    Views: {
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
