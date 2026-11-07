'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Appointment, AppointmentStatus, TenantFixture } from '@/mock/fixtures';

/** Appointment changes live in page state only; nothing is saved. */
export function useReception(fixture: TenantFixture) {
  const [appointments, setAppointments] = useState<Appointment[]>(fixture.appointments);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(id);
  }, [toast]);

  const update = useCallback((id: string, patch: Partial<Appointment>) => {
    setAppointments((list) => list.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  }, []);

  const setStatus = useCallback(
    (id: string, status: AppointmentStatus, extra: Partial<Appointment> = {}) =>
      update(id, { status, ...extra }),
    [update],
  );

  return { appointments, setStatus, update, toast, notify: setToast };
}
