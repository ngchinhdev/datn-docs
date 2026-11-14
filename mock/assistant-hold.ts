/*
 * The hold the assistant makes when the customer picks a time (BR-07, BR-92): a held appointment
 * on the calendar for 10 minutes, with no customer yet. The assistant never confirms; the booking
 * page does, once the code from the email is typed (BR-16). Pure over a fixture; imports only
 * types and pure modules, so Node can run it (scripts/check-assistant.ts).
 */
import { ANY_STAFF } from './availability.ts';
import { slotsOn, type SlotChoice } from './assistant.ts';
import {
  bookingSlots,
  buildAppointment,
  type BookingItemRef,
  type BookingSlot,
} from './booking.ts';
import type { Appointment, TenantFixture } from './fixtures/types.ts';
import { termsFrom } from './policy.ts';
import { addDays, addMinutes, localDate } from './time.ts';

/** BR-07. */
export const HOLD_MINUTES = 10;

export interface HoldRequest {
  fixture: TenantFixture;
  /** Id of the appointment the hold is, e.g. `toc-may-a-web7`. */
  appointmentId: string;
  serviceId: string;
  variantId: string;
  /** `ANY_STAFF` or the person the customer asked for. */
  staffChoice: string;
  slot: SlotChoice;
  now: string;
  /** Holds the chat made before, which this one takes the place of (one hold per chat). */
  replaces?: string;
}

export interface Hold {
  appointment: Appointment;
  /** The slot as the booking page knows it, so the page can carry on from it. */
  bookingSlot: BookingSlot;
  ref: BookingItemRef;
  /** ISO 8601, UTC. */
  expiresAt: string;
}

/**
 * The hold for a time of a card, or `null` when the time is gone. "Bất kỳ ai" is placed the way
 * the booking page places it (BR-57), so both pages agree on who it is.
 */
export function makeHold(req: HoldRequest): Hold | null {
  const { fixture, slot, now } = req;
  const ref: BookingItemRef = {
    key: req.serviceId,
    serviceId: req.serviceId,
    variantId: req.variantId,
    staffChoice: req.staffChoice,
  };
  const appointments = fixture.appointments.filter((a) => a.id !== req.replaces);
  const { main } = bookingSlots(
    fixture,
    [ref],
    'single',
    localDate(slot.startAt),
    now,
    { appointments },
    true,
  );
  const found = main.find(
    (s) =>
      s.startAt === slot.startAt &&
      (req.staffChoice === ANY_STAFF || s.items[0]?.staffResourceId === slot.staffResourceId),
  );
  if (!found) return null;
  const expiresAt = addMinutes(now, HOLD_MINUTES);
  return {
    bookingSlot: found,
    ref,
    expiresAt,
    appointment: buildAppointment({
      fixture,
      id: req.appointmentId,
      customerId: null,
      refs: [ref],
      subjectIds: [''],
      slot: found,
      status: 'held',
      holdExpiresAt: expiresAt,
      terms: termsFrom(fixture.policies, fixture.config.refundTiers),
    }),
  };
}

export type HoldState = 'active' | 'returned' | 'used';

/**
 * What a hold card shows: counting down, given back (ran out, or was dropped), or turned into a
 * booking on the booking page (BR-07).
 */
export function holdState(appointment: Appointment | undefined, now: string): HoldState {
  if (!appointment || appointment.status === 'cancelled') return 'returned';
  if (appointment.status !== 'held') return 'used';
  return appointment.holdExpiresAt && Date.parse(appointment.holdExpiresAt) > Date.parse(now)
    ? 'active'
    : 'returned';
}

/**
 * After a hold ran out: the times still free for the same person, from the day of the held time on
 * (BR-07). A time that someone took in between is not offered again.
 */
export function offerAfterExpiry(
  fixture: TenantFixture,
  hold: { serviceId: string; variantId: string; staffChoice: string; slot: SlotChoice },
  now: string,
): { date: string; slots: SlotChoice[] } | null {
  const service = fixture.services.find((s) => s.id === hold.serviceId);
  const variant = service?.variants.find((v) => v.id === hold.variantId);
  if (!service || !variant) return null;
  const first = localDate(hold.slot.startAt);
  for (let i = 0; i < 7; i++) {
    const date = addDays(first, i);
    const slots = slotsOn(fixture, service, variant, hold.staffChoice, date, now).slice(0, 3);
    if (slots.length > 0) return { date, slots };
  }
  return null;
}
