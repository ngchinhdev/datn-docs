'use client';

import { useCallback, useState } from 'react';
import { useToast } from '@/components/sapio/toast';
import type { Appointment, AppointmentStatus, TenantFixture } from '@/mock/fixtures';

/** Appointment changes live in page state only; nothing is saved. */
export function useReception(fixture: TenantFixture) {
  const [appointments, setAppointments] = useState<Appointment[]>(fixture.appointments);
  const show = useToast();
  const notify = useCallback((text: string) => show({ text }), [show]);

  const update = useCallback((id: string, patch: Partial<Appointment>) => {
    setAppointments((list) => list.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  }, []);

  const setStatus = useCallback(
    (id: string, status: AppointmentStatus, extra: Partial<Appointment> = {}) =>
      update(id, { status, ...extra }),
    [update],
  );

  return { appointments, setStatus, update, notify, show };
}
