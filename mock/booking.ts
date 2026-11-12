/*
 * What an online booking is once the customer has chosen: the items it has, the appointment it
 * becomes, and whether its time is still free after the hold ran out (BR-07, BR-29). Pure over a
 * fixture; imports only types and pure modules, so Node can run it (scripts/check-availability.ts).
 */
import {
  ANY_STAFF,
  freeChainSlots,
  freeGroupSlots,
  type AvailabilityQuery,
  type ChainQuery,
  type FreeChainSlot,
} from './availability.ts';
import { bookVariant } from './fixtures/bookings.ts';
import type {
  Appointment,
  AppointmentItem,
  ServedSubject,
  Service,
  ServiceVariant,
  TenantFixture,
} from './fixtures/types.ts';
import { priceFor } from './occupation.ts';
import { addDays, localDate } from './time.ts';

/** A slot of a chain or a group; `staggered` marks a group combination that starts apart (BR-19). */
export type BookingSlot = FreeChainSlot & { staggered?: true };

/** `chain`: one subject, services one after the other (BR-18); `group`: one service each (BR-19). */
export type BookingMode = 'single' | 'chain' | 'group';

/** One item of a booking, small enough to keep while the customer pays. */
export interface BookingItemRef {
  /** Service id in a chain; subject or person id in a group. */
  key: string;
  /** Name of the subject or person in a group. */
  label?: string;
  serviceId: string;
  variantId: string;
  /** `ANY_STAFF` or a staff resource id: who the customer asked for (BR-31). */
  staffChoice: string;
  /** A subject typed in during the booking, not saved yet (BR-71). */
  newSubject?: ServedSubject;
}

export const slotKey = (s: BookingSlot) =>
  `${s.staggered ? 'x' : 't'}${s.items.map((i) => i.startAt).join('/')}`;

const lookup = (fixture: TenantFixture, ref: BookingItemRef) => {
  const service = fixture.services.find((s) => s.id === ref.serviceId) as Service;
  const variant = service.variants.find((v) => v.id === ref.variantId) as ServiceVariant;
  return { service, variant };
};

type State = AvailabilityQuery['state'];

const queryOf = (
  fixture: TenantFixture,
  refs: readonly BookingItemRef[],
  date: string,
  notBefore: string,
  state?: State,
): ChainQuery => ({
  fixture,
  date,
  notBefore,
  now: notBefore,
  ...(state ? { state } : {}),
  items: refs.map((ref) => ({
    variant: lookup(fixture, ref).variant,
    serviceId: ref.serviceId,
    staffResourceId: ref.staffChoice,
  })),
});

/**
 * Times a booking can start on one day: the whole chain fitting, or everyone starting at once;
 * for a group, the staggered combinations after them.
 */
export function bookingSlots(
  fixture: TenantFixture,
  refs: readonly BookingItemRef[],
  mode: BookingMode,
  date: string,
  notBefore: string,
  state?: State,
): { main: BookingSlot[]; staggered: BookingSlot[] } {
  if (refs.length === 0) return { main: [], staggered: [] };
  const query = queryOf(fixture, refs, date, notBefore, state);
  if (mode === 'group') {
    const { together, staggered } = freeGroupSlots(query);
    return {
      main: together,
      staggered: staggered.map((s) => ({ ...s, staggered: true as const })),
    };
  }
  return { main: freeChainSlots(query), staggered: [] };
}

/**
 * BR-29: is the time the customer chose still free once their hold is gone? Looks for the same
 * start (and, for a staggered group, the same starts) among the free times; the people may differ
 * when the customer left it to the system, so the slot that is found is the one to book.
 */
export function stillFree(
  fixture: TenantFixture,
  refs: readonly BookingItemRef[],
  mode: BookingMode,
  chosen: BookingSlot,
  now: string,
  state: State,
): BookingSlot | null {
  const date = localDate(chosen.startAt);
  const { main, staggered } = bookingSlots(fixture, refs, mode, date, now, state);
  const pool = chosen.staggered ? staggered : main;
  return pool.find((s) => slotKey(s) === slotKey(chosen)) ?? null;
}

/** BR-29: the nearest times after `after` that are free, for the customer who lost theirs. */
export function nearestSlots(
  fixture: TenantFixture,
  refs: readonly BookingItemRef[],
  mode: BookingMode,
  after: string,
  now: string,
  state: State,
  count = 3,
): BookingSlot[] {
  const first = localDate(after);
  const found: BookingSlot[] = [];
  for (let i = 0; i < 7 && found.length < count; i++) {
    const { main } = bookingSlots(fixture, refs, mode, addDays(first, i), now, state);
    for (const s of main) if (s.startAt > after && found.length < count) found.push(s);
  }
  return found;
}

export interface AppointmentInput {
  fixture: TenantFixture;
  id: string;
  customerId: string | null;
  refs: readonly BookingItemRef[];
  /** Subject id per item, in the order of `refs`. */
  subjectIds: readonly string[];
  slot: BookingSlot;
  status: 'held' | 'confirmed';
  holdExpiresAt?: string;
  depositVnd?: bigint;
}

/** The appointment a booking becomes: prices kept as quoted (BR-12), one booking per resource. */
export function buildAppointment(input: AppointmentInput): Appointment {
  const { fixture, refs, slot } = input;
  const items: AppointmentItem[] = refs.map((ref, i) => {
    const { variant } = lookup(fixture, ref);
    const staff = fixture.staff
      .filter((m) => m.profile.bookableOnline && m.skillServiceIds.includes(ref.serviceId))
      .map((m) => ({ resourceId: m.resourceId, level: m.level }));
    return {
      serviceVariantId: variant.id,
      servedSubjectId: input.subjectIds[i] ?? '',
      staffResourceId: slot.items[i]!.staffResourceId,
      staffChoice: ref.staffChoice === ANY_STAFF ? 'any' : 'chosen',
      priceVnd: priceFor(variant, ref.staffChoice, staff),
    };
  });
  return {
    id: input.id,
    tenantId: fixture.tenant.id,
    branchId: fixture.branches[0]?.id ?? '',
    customerId: input.customerId,
    startAt: slot.startAt,
    status: input.status,
    channel: 'online',
    items,
    bookings: refs.flatMap((ref, i) =>
      bookVariant(
        slot.items[i]!.startAt,
        lookup(fixture, ref).variant,
        slot.items[i]!.assignment,
        i,
      ),
    ),
    ...(input.holdExpiresAt ? { holdExpiresAt: input.holdExpiresAt } : {}),
    ...(input.depositVnd ? { depositVnd: input.depositVnd } : {}),
  };
}
