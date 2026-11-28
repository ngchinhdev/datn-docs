'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { usePersistedState } from '@/components/mock/use-persisted-state';
import type { PlanItem } from '@/components/sapio/chain-plan';
import type { BookingItemRef, BookingMode, BookingSlot } from '@/mock/booking';
import { readSlice, writeSlice } from '@/mock/persist';

/** A service picked in a chain (BR-18). */
export interface ChainPick {
  serviceId: string;
  variantId: string;
}

/** A person of a group at a salon: the booker, then companions with a name only (BR-19). */
export interface Person {
  id: string;
  name: string;
  pick: ChainPick | null;
}

/** What the booking page holds, so it can be picked up again after the payment page. */
export interface BookingState {
  picks: ChainPick[];
  people: Person[] | null;
  staffByKey: Record<string, string>;
  date: string;
  name: string;
  phone: string;
  email: string;
  slot: BookingSlot | null;
  holdExpiresAt: string | null;
}

/** A booking on its way to payment (MH-15). Kept in the tab until it closes. */
export interface BookingDraft {
  id: string;
  tenantSlug: string;
  newCustomer: boolean;
  /** Who filled the choices in: the assistant of the customer page, for the line the booking page shows. */
  source?: 'assistant';
  state: BookingState;
  refs: BookingItemRef[];
  mode: BookingMode;
  slot: BookingSlot;
  /** ISO 8601, UTC: BR-07, counted from the moment the time was chosen. */
  holdExpiresAt: string;
  /** Mock clock when the customer left the booking page; the countdown goes on from here. */
  now: string;
  contact: { name: string; phone: string; email: string };
  priceVnd: bigint;
  depositVnd: bigint;
  /** Texts for the payment page, from the same strings the booking page shows. */
  display: { slotLine: string; people: string; plan: PlanItem[]; day: string };
}

interface BookingDraftValue {
  draft: BookingDraft | null;
  setDraft: (draft: BookingDraft | null) => void;
  /** Choices to start the booking page with, e.g. "Đặt lại" from a past booking. */
  seed: { tenantSlug: string; state: BookingState } | null;
  setSeed: (seed: { tenantSlug: string; state: BookingState } | null) => void;
}

const BookingDraftContext = createContext<BookingDraftValue | null>(null);

export function BookingDraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = usePersistedState<BookingDraft | null>('booking-draft', null);
  const [seed, setSeed] = usePersistedState<BookingDraftValue['seed']>('booking-seed', null);
  const value = useMemo(() => ({ draft, setDraft, seed, setSeed }), [draft, seed]);
  return <BookingDraftContext.Provider value={value}>{children}</BookingDraftContext.Provider>;
}

export function useBookingDraft() {
  const ctx = useContext(BookingDraftContext);
  if (!ctx) throw new Error('useBookingDraft() needs <BookingDraftProvider>');
  return ctx;
}

let sequence = 0;
/** Counts on from the highest number the tab has used, so ids made after a reload stay unique. */
export const nextDraftId = () => {
  const saved = readSlice('draft-sequence');
  if (typeof saved === 'number' && saved > sequence) sequence = saved;
  sequence += 1;
  writeSlice('draft-sequence', sequence);
  return `${sequence}`;
};

/** The code a customer types as the transfer note, e.g. `SP 7K2Q9`. */
export const paymentCode = (draftId: string) =>
  (Number(draftId) * 99991 + 7919).toString(36).toUpperCase().padStart(5, '0').slice(-5);
