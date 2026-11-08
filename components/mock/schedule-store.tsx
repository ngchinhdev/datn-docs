'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import {
  tenantFixtures,
  type Appointment,
  type Customer,
  type ServedSubject,
  type Shift,
  type StaffTimeOff,
} from '@/mock/fixtures';

interface ScheduleStore {
  appointments: Appointment[];
  /** Replaces one appointment by id. */
  replaceAppointment: (appt: Appointment) => void;
  /** Adds an appointment, or takes it away again (undo of a create). */
  addAppointment: (appt: Appointment) => void;
  removeAppointment: (id: string) => void;
  customers: Customer[];
  servedSubjects: ServedSubject[];
  /** A customer or pet made while creating an appointment; `remove*` is the undo. */
  addCustomer: (customer: Customer) => void;
  removeCustomer: (id: string) => void;
  addSubject: (subject: ServedSubject) => void;
  removeSubject: (id: string) => void;
  shifts: Shift[];
  setShifts: (shifts: Shift[]) => void;
  /** Leave requests; a technician's new one is pending until a manager decides (BR-11). */
  leaves: StaffTimeOff[];
  addLeaves: (leaves: StaffTimeOff[]) => void;
  replaceLeave: (leave: StaffTimeOff) => void;
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
  const [customers, setCustomers] = useState<Customer[]>(fixture.customers);
  const [servedSubjects, setSubjects] = useState<ServedSubject[]>(fixture.servedSubjects);
  const [shifts, setShifts] = useState<Shift[]>(fixture.shifts);
  const [leaves, setLeaves] = useState<StaffTimeOff[]>(fixture.staffTimeOff);
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
  const addLeaves = useCallback((added: StaffTimeOff[]) => {
    setLeaves((list) => [...list, ...added]);
  }, []);
  const replaceLeave = useCallback((leave: StaffTimeOff) => {
    setLeaves((list) => list.map((l) => (l.id === leave.id ? leave : l)));
  }, []);
  const addCustomer = useCallback((customer: Customer) => {
    setCustomers((list) => [...list, customer]);
  }, []);
  const removeCustomer = useCallback((id: string) => {
    setCustomers((list) => list.filter((c) => c.id !== id));
  }, []);
  const addSubject = useCallback((subject: ServedSubject) => {
    setSubjects((list) => [...list, subject]);
  }, []);
  const removeSubject = useCallback((id: string) => {
    setSubjects((list) => list.filter((s) => s.id !== id));
  }, []);

  const value = useMemo(
    () => ({
      appointments,
      replaceAppointment,
      addAppointment,
      removeAppointment,
      customers,
      servedSubjects,
      addCustomer,
      removeCustomer,
      addSubject,
      removeSubject,
      shifts,
      setShifts,
      leaves,
      addLeaves,
      replaceLeave,
      staffSeesCustomerPhone,
      setStaffSeesCustomerPhone,
    }),
    [
      appointments,
      replaceAppointment,
      addAppointment,
      removeAppointment,
      customers,
      servedSubjects,
      addCustomer,
      removeCustomer,
      addSubject,
      removeSubject,
      shifts,
      leaves,
      addLeaves,
      replaceLeave,
      staffSeesCustomerPhone,
    ],
  );
  return <ScheduleContext.Provider value={value}>{children}</ScheduleContext.Provider>;
}

export function useScheduleStore() {
  const store = useContext(ScheduleContext);
  if (!store) throw new Error('useScheduleStore() needs <ScheduleStoreProvider>');
  return store;
}
