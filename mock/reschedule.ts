/*
 * A booking the customer already has, seen as the items they chose: to book it again, to change
 * its time (BR-08, BR-12) or to answer a question of the shop (BR-32, BR-33). Pure over a
 * fixture; imports only types and pure modules, so Node can run it (scripts/check-availability.ts).
 */
import { ANY_STAFF } from './availability.ts';
import { bookVariant } from './fixtures/bookings.ts';
import type { BookingItemRef, BookingMode, BookingSlot } from './booking.ts';
import type {
  Appointment,
  LeaveHandling,
  Requeue,
  ServedSubject,
  Service,
  ServiceVariant,
  StaffTimeOff,
  TenantFixture,
} from './fixtures/types.ts';

export interface HeldItem {
  /** Subject or person id with the position, so two items of one subject keep two keys. */
  key: string;
  /** The name of the subject; absent when the customer is the only one served. */
  label?: string;
  service: Service;
  variant: ServiceVariant;
  /** `ANY_STAFF`, or the person the customer chose. */
  staffChoice: string;
  /** Price at booking time (BR-12). */
  priceVnd: bigint;
}

/** BR-19: more than one subject in a booking makes it a group; one subject, a chain. */
export function modeOf(appt: Appointment): BookingMode {
  if (appt.items.length < 2) return 'single';
  return new Set(appt.items.map((i) => i.servedSubjectId)).size > 1 ? 'group' : 'chain';
}

const find = (fixture: TenantFixture, variantId: string) => {
  for (const service of fixture.services) {
    const variant = service.variants.find((v) => v.id === variantId);
    if (variant) return { service, variant };
  }
  return null;
};

/** The items of a booking in the order the customer has them; `named` adds the subject's name. */
export function heldItems(
  fixture: TenantFixture,
  appt: Appointment,
  subjects: readonly ServedSubject[],
  named: boolean,
): HeldItem[] {
  return appt.items.flatMap((item, i) => {
    const hit = find(fixture, item.serviceVariantId);
    if (!hit) return [];
    const subject = subjects.find((s) => s.id === item.servedSubjectId);
    return [
      {
        key: `${item.servedSubjectId || 'self'}:${i}`,
        ...(named && subject ? { label: subject.name } : {}),
        ...hit,
        staffChoice: item.staffChoice === 'chosen' ? item.staffResourceId : ANY_STAFF,
        priceVnd: item.priceVnd,
      },
    ];
  });
}

export const refsOfItems = (items: readonly HeldItem[]): BookingItemRef[] =>
  items.map((it) => ({
    key: it.key,
    ...(it.label ? { label: it.label } : {}),
    serviceId: it.service.id,
    variantId: it.variant.id,
    staffChoice: it.staffChoice,
  }));

/**
 * BR-12, BR-08: the booking at a new time. Prices stay as they were; the person may change only
 * when the customer left it to the system; the deposit and the status stay.
 */
export function movedAppointment(
  fixture: TenantFixture,
  appt: Appointment,
  slot: BookingSlot,
  countChange: boolean,
): Appointment {
  return {
    ...appt,
    startAt: slot.startAt,
    items: appt.items.map((item, i) => {
      const { swapUnconfirmed: _gone, ...rest } = item;
      void _gone;
      return { ...rest, staffResourceId: slot.items[i]?.staffResourceId ?? item.staffResourceId };
    }),
    bookings: appt.items.flatMap((item, i) => {
      const hit = find(fixture, item.serviceVariantId);
      const placed = slot.items[i];
      return hit && placed ? bookVariant(placed.startAt, hit.variant, placed.assignment, i) : [];
    }),
    ...(countChange ? { selfChanges: (appt.selfChanges ?? 0) + 1 } : {}),
  };
}

/** A question of the shop waiting for this booking, from a leave request or a shortened shift. */
export type OpenQuestion =
  | { source: 'leave'; leave: StaffTimeOff; handling: Extract<LeaveHandling, { kind: 'asked' }> }
  | {
      source: 'requeue';
      requeue: Requeue;
      handling: Extract<LeaveHandling, { kind: 'asked' }>;
    };

export function openQuestion(
  apptId: string,
  leaves: readonly StaffTimeOff[],
  requeues: readonly Requeue[],
): OpenQuestion | null {
  for (const leave of leaves) {
    const handling = leave.handling?.[apptId];
    if (handling?.kind === 'asked' && leave.status === 'pending') {
      return { source: 'leave', leave, handling };
    }
  }
  for (const requeue of requeues) {
    const handling = requeue.handling[apptId];
    if (handling?.kind === 'asked') return { source: 'requeue', requeue, handling };
  }
  return null;
}

/** `TM-2611-0384`: the code on the confirmation email, from the shop, the month and the booking. */
export function bookingCode(fixture: TenantFixture, appt: Appointment): string {
  const shop = fixture.tenant.slug
    .split('-')
    .map((w) => w.charAt(0))
    .join('')
    .toUpperCase();
  const month = appt.startAt.slice(2, 4) + appt.startAt.slice(5, 7);
  let hash = 0;
  for (const ch of appt.id) hash = (hash * 31 + ch.charCodeAt(0)) % 10_000;
  return `${shop}-${month}-${String(hash).padStart(4, '0')}`;
}

/** The choices that make a booking again: the same services, the same people, a new time. */
export interface RebookChoice {
  picks: { serviceId: string; variantId: string }[];
  chosenIds: string[];
  serviceFor: Record<string, string>;
  people:
    { id: string; name: string; pick: { serviceId: string; variantId: string } | null }[] | null;
  staffByKey: Record<string, string>;
}

export function rebookChoice(
  fixture: TenantFixture,
  appt: Appointment,
  subjects: readonly ServedSubject[],
): RebookChoice {
  const asksSubject = fixture.template.vocabulary.subject !== null;
  const mode = modeOf(appt);
  const items = heldItems(fixture, appt, subjects, asksSubject || mode === 'group');
  const pick = (it: HeldItem) => ({ serviceId: it.service.id, variantId: it.variant.id });
  const empty = { picks: [], chosenIds: [], serviceFor: {}, people: null, staffByKey: {} };

  if (asksSubject) {
    return {
      ...empty,
      chosenIds: appt.items.map((i) => i.servedSubjectId),
      serviceFor: Object.fromEntries(
        appt.items.map((i, n) => [i.servedSubjectId, items[n]!.service.id]),
      ),
      staffByKey: Object.fromEntries(
        appt.items.map((i, n) => [i.servedSubjectId, items[n]!.staffChoice]),
      ),
    };
  }
  if (mode === 'group') {
    return {
      ...empty,
      people: items.map((it, n) => ({
        id: `p${n + 1}`,
        name: n === 0 ? 'Bạn' : (it.label ?? ''),
        pick: pick(it),
      })),
      staffByKey: Object.fromEntries(items.map((it, n) => [`p${n + 1}`, it.staffChoice])),
    };
  }
  return {
    ...empty,
    picks: items.map(pick),
    staffByKey: Object.fromEntries(items.map((it) => [it.service.id, it.staffChoice])),
  };
}
