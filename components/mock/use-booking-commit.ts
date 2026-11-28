'use client';

import type { Appointment, Customer } from '@/mock/fixtures';
import { buildAppointment, type BookingSlot } from '@/mock/booking';
import { termsFrom } from '@/mock/policy';
import type { BookingDraft } from './booking-draft';
import { useScheduleStore } from './schedule-store';
import { useLiveFixture } from './use-live-fixture';

/**
 * Puts an online booking on the calendar of the tenant, where the receptionist sees it: first as a
 * hold while the customer pays, then confirmed (BR-07, BR-29). The customer is matched by the
 * email they confirmed (BR-16), else made.
 */
export function useBookingCommit(tenantSlug: string) {
  const store = useScheduleStore();
  const fixture = useLiveFixture(tenantSlug);
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

    const appt = buildAppointment({
      fixture,
      id: `${tenantId}-a-web${draft.id}`,
      customerId,
      refs: draft.refs,
      slot,
      status,
      ...(status === 'held' ? { holdExpiresAt: draft.holdExpiresAt } : {}),
      ...(status === 'confirmed' && draft.depositVnd > 0n ? { depositVnd: draft.depositVnd } : {}),
      // BR-38: the booking keeps the terms of the day it was made.
      terms: termsFrom(fixture.policies, fixture.config.refundTiers),
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
      slot: draft.slot,
      status: 'confirmed',
    });
    store.addAppointment(appt);
    return appt;
  }

  return { commit, release, rival, appointments: store.appointments, fixture };
}
