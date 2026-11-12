'use client';

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { PlanItem } from '@/components/sapio/chain-plan';
import type { BookingItemRef, BookingMode, BookingSlot } from '@/mock/booking';
import type { SubjectValues } from '@/mock/subject-schema';

/** A service picked in a chain (BR-18). */
export interface ChainPick {
  serviceId: string;
  variantId: string;
}

/** A subject being typed in: valid once its values follow the industry schema (BR-71). */
export interface SubjectDraft {
  id: string;
  name: string;
  values: SubjectValues;
  touched: string[];
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
  chosenIds: string[];
  drafts: SubjectDraft[];
  serviceFor: Record<string, string>;
  /** The services of the only subject, in order (BR-18); `null` until they are picked. */
  petChain: string[] | null;
  staffByKey: Record<string, string>;
  date: string;
  name: string;
  phone: string;
  email: string;
  slot: BookingSlot | null;
  holdExpiresAt: string | null;
}

/** A booking on its way to payment (MH-15). Kept in memory: a reload starts the booking again. */
export interface BookingDraft {
  id: string;
  tenantSlug: string;
  newCustomer: boolean;
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
  const [draft, setDraft] = useState<BookingDraft | null>(null);
  const [seed, setSeed] = useState<BookingDraftValue['seed']>(null);
  const value = useMemo(() => ({ draft, setDraft, seed, setSeed }), [draft, seed]);
  return <BookingDraftContext.Provider value={value}>{children}</BookingDraftContext.Provider>;
}

export function useBookingDraft() {
  const ctx = useContext(BookingDraftContext);
  if (!ctx) throw new Error('useBookingDraft() needs <BookingDraftProvider>');
  return ctx;
}

let sequence = 0;
export const nextDraftId = () => `${(sequence += 1)}`;

/** The code a customer types as the transfer note, e.g. `SP 7K2Q9`. */
export const paymentCode = (draftId: string) =>
  (Number(draftId) * 99991 + 7919).toString(36).toUpperCase().padStart(5, '0').slice(-5);
