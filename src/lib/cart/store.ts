'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SavedBuildItem } from '@/types/domain';

/**
 * Cart state.
 *
 * Persisted to localStorage so a cart survives a refresh without requiring an
 * account. What is stored is the SHAPE of the order (which components, how
 * many) plus a price snapshot used only for display.
 *
 * The snapshot is never trusted: /api/checkout re-resolves every line against
 * the database and recalculates the total server-side before creating a Stripe
 * session. A client that edits localStorage changes what it sees, not what it
 * pays.
 */

export interface CartBuildLine {
  id: string;
  kind: 'build';
  name: string;
  items: SavedBuildItem[];
  quantity: number;
  /** Display-only snapshot of the hardware subtotal, in cents. */
  snapshotPriceCents: number;
  includesOs: boolean;
}

export interface CartComponentLine {
  id: string;
  kind: 'component';
  name: string;
  componentId: string;
  quantity: number;
  snapshotPriceCents: number;
}

export type CartLine = CartBuildLine | CartComponentLine;

interface CartState {
  lines: CartLine[];
  province: string;
  addBuild: (line: Omit<CartBuildLine, 'id' | 'kind'>) => void;
  addComponent: (line: Omit<CartComponentLine, 'id' | 'kind' | 'quantity'>, quantity?: number) => void;
  setQuantity: (id: string, quantity: number) => void;
  remove: (id: string) => void;
  clear: () => void;
  setProvince: (province: string) => void;
  itemCount: () => number;
}

function newId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `line-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      province: 'ON',

      addBuild: (line) =>
        set((state) => ({
          lines: [...state.lines, { ...line, id: newId(), kind: 'build' }],
        })),

      addComponent: (line, quantity = 1) =>
        set((state) => {
          // Adding the same loose part twice increments instead of duplicating.
          const existing = state.lines.find(
            (l): l is CartComponentLine => l.kind === 'component' && l.componentId === line.componentId,
          );
          if (existing) {
            return {
              lines: state.lines.map((l) =>
                l.id === existing.id ? { ...l, quantity: l.quantity + quantity } : l,
              ),
            };
          }
          return {
            lines: [...state.lines, { ...line, quantity, id: newId(), kind: 'component' }],
          };
        }),

      setQuantity: (id, quantity) =>
        set((state) => ({
          lines:
            quantity <= 0
              ? state.lines.filter((l) => l.id !== id)
              : state.lines.map((l) => (l.id === id ? { ...l, quantity: Math.min(quantity, 20) } : l)),
        })),

      remove: (id) => set((state) => ({ lines: state.lines.filter((l) => l.id !== id) })),

      clear: () => set({ lines: [] }),

      setProvince: (province) => set({ province }),

      itemCount: () => get().lines.reduce((sum, line) => sum + line.quantity, 0),
    }),
    {
      name: 'pcbc-cart-v1',
      partialize: (state) => ({ lines: state.lines, province: state.province }),
    },
  ),
);
