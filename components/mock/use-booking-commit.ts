'use client';

import {
  tenantFixtures,
  type Appointment,
  type Customer,
  type ServedSubject,
} from '@/mock/fixtures';
import { buildAppointment, type BookingSlot } from '@/mock/booking';
import type { BookingDraft } from './booking-draft';
import { useScheduleStore } from './schedule-store';

/**
 * Puts an online booking on the calendar of the tenant, where the receptionist sees it: first as a
 * hold while the customer pays, then confirmed (BR-07, BR-29). The customer is matched by the
 * email they confirmed (BR-16), else made; a new subject is saved with them (BR-17).
 */
export function useBookingCommit(tenantSlug: string) {
  const store = useScheduleStore();
  const fixture = tenantFixtures.find((f) => f.tenant.slug === tenantSlug) ?? tenantFixtures[0]!;
  const tenantId = fixture.tenant.id;

  function commit(
    draft: BookingDraft,
    status: 'held' | 'confirmed',
    slot: BookingSlot = draft.slot,
  ): Appointment {
    const { contact } = draft;
    const email = contact.email.trim().toLowerCase();
    // BR-16: the email is what the customer proved with the code, so it is what identifies them;
    // the same phone under another email is another customer.
    const found = store.customers.find((c) => c.email?.toLowerCase() === email);
    const customerId = found?.id ?? `${tenantId}-c-web${draft.id}`;
    if (!found && !store.customers.some((c) => c.id === customerId)) {
      const customer: Customer = {
        id: customerId,
        tenantId,
        name: contact.name.trim(),
        callName: contact.name.trim().split(/\s+/).at(-1) ?? contact.name.trim(),
        phone: contact.phone,
        email: contact.email.trim(),
        visitCount: 0,
      };
      store.addCustomer(customer);
    }

    const saveSubject = (id: string, subject: ServedSubject) => {
      if (!store.servedSubjects.some((x) => x.id === id)) {
        store.addSubject({ ...subject, id, customerId });
      }
      return id;
    };
    let bookerId: string | undefined;
    const booker = () =>
      (bookerId ??=
        store.servedSubjects.find((x) => x.customerId === customerId && x.kind === 'self')?.id ??
        saveSubject(`${tenantId}-s-web${draft.id}-self`, {
          id: '',
          tenantId,
          customerId,
          kind: 'self',
          name: contact.name.trim(),
          attributes: {},
        }));
    const subjectIds = draft.refs.map((ref, i) => {
      // A pet typed in during the booking, or one the customer already has (BR-17).
      // One id per subject, so the items of a chain share it.
      if (ref.newSubject) {
        return saveSubject(`${tenantId}-s-web${draft.id}-${ref.newSubject.id}`, ref.newSubject);
      }
      const known = ref.subjectId ?? ref.key;
      if (store.servedSubjects.some((x) => x.id === known)) return known;
      // A companion is known by name only (BR-19); the booker, and a chain, are the booker.
      if (draft.mode === 'group' && ref.key !== 'p1') {
        return saveSubject(`${tenantId}-s-web${draft.id}-${ref.key}`, {
          id: '',
          tenantId,
          customerId,
          kind: 'other',
          name: ref.label ?? '',
          attributes: {},
        });
      }
      return booker();
    });

    const appt = buildAppointment({
      fixture,
      id: `${tenantId}-a-web${draft.id}`,
      customerId,
      refs: draft.refs,
      subjectIds,
      slot,
      status,
      ...(status === 'held' ? { holdExpiresAt: draft.holdExpiresAt } : {}),
      ...(status === 'confirmed' && draft.depositVnd > 0n ? { depositVnd: draft.depositVnd } : {}),
    });
    if (store.appointments.some((a) => a.id === appt.id)) store.replaceAppointment(appt);
    else store.addAppointment(appt);
    return appt;
  }

  /** The hold ran out or was given up: the time goes back to the free times (BR-07). */
  function release(draft: BookingDraft) {
    const id = `${tenantId}-a-web${draft.id}`;
    if (store.appointments.some((a) => a.id === id)) store.removeAppointment(id);
  }

  /**
   * Mock only: another customer books the same time while the hold is gone, to show what
   * happens when the money arrives late (BR-29).
   */
  function rival(draft: BookingDraft): Appointment {
    const appt = buildAppointment({
      fixture,
      id: `${tenantId}-a-rival${draft.id}`,
      customerId: null,
      refs: draft.refs,
      subjectIds: draft.refs.map(() => ''),
      slot: draft.slot,
      status: 'confirmed',
    });
    store.addAppointment(appt);
    return appt;
  }

  return { commit, release, rival, appointments: store.appointments, fixture };
}
