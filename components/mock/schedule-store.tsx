'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { tenantFixtures, type Appointment } from '@/mock/fixtures';

interface ScheduleStore {
  appointments: Appointment[];
  /** Replaces one appointment by id. */
  replaceAppointment: (appt: Appointment) => void;
  /** Adds an appointment, or takes it away again (undo of a create). */
  addAppointment: (appt: Appointment) => void;
  removeAppointment: (id: string) => void;
  /** Technicians see customers' phone numbers (BR-36). */
  staffSeesCustomerPhone: boolean;
  setStaffSeesCustomerPhone: (value: boolean) => void;
}

const ScheduleContext = createContext<ScheduleStore | null>(null);

/**
 * The calendar of the tenant being viewed, so a change on one screen shows on every other: nothing
 * is saved, a reload starts from the sample data again.
 */
export function ScheduleStoreProvider({
  tenantSlug,
  children,
}: {
  tenantSlug: string;
  children: ReactNode;
}) {
  const fixture = tenantFixtures.find((f) => f.tenant.slug === tenantSlug) ?? tenantFixtures[0]!;
  const [appointments, setAppointments] = useState<Appointment[]>(fixture.appointments);
  const [staffSeesCustomerPhone, setStaffSeesCustomerPhone] = useState(
    fixture.staffSeesCustomerPhone,
  );

  const replaceAppointment = useCallback((appt: Appointment) => {
    setAppointments((list) => list.map((a) => (a.id === appt.id ? appt : a)));
  }, []);
  const addAppointment = useCallback((appt: Appointment) => {
    setAppointments((list) => [...list, appt]);
  }, []);
  const removeAppointment = useCallback((id: string) => {
    setAppointments((list) => list.filter((a) => a.id !== id));
  }, []);

  const value = useMemo(
    () => ({
      appointments,
      replaceAppointment,
      addAppointment,
      removeAppointment,
      staffSeesCustomerPhone,
      setStaffSeesCustomerPhone,
    }),
    [appointments, replaceAppointment, addAppointment, removeAppointment, staffSeesCustomerPhone],
  );
  return <ScheduleContext.Provider value={value}>{children}</ScheduleContext.Provider>;
}

export function useScheduleStore() {
  const store = useContext(ScheduleContext);
  if (!store) throw new Error('useScheduleStore() needs <ScheduleStoreProvider>');
  return store;
}
