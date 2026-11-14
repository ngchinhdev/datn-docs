'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { useAccountStore } from '@/components/mock/account-store';
import { tenantFixtures, type Staff } from '@/mock/fixtures';

interface StaffStore {
  staff: Staff[];
  /** Replaces one member of staff; lives in page state, nothing is saved. */
  save: (member: Staff) => void;
}

const StaffContext = createContext<StaffStore | null>(null);

/** Staff of the tenant being viewed, so an edit shows up in every page of the app at once. */
export function StaffStoreProvider({
  tenantSlug,
  children,
}: {
  tenantSlug: string;
  children: ReactNode;
}) {
  const fixture = tenantFixtures.find((f) => f.tenant.slug === tenantSlug) ?? tenantFixtures[0]!;
  const { joiners } = useAccountStore();
  const [staff, setStaff] = useState(() => [...fixture.staff, ...(joiners[tenantSlug] ?? [])]);
  const save = useCallback((member: Staff) => {
    setStaff((list) => list.map((s) => (s.resourceId === member.resourceId ? member : s)));
  }, []);
  const value = useMemo(() => ({ staff, save }), [staff, save]);
  return <StaffContext.Provider value={value}>{children}</StaffContext.Provider>;
}

export function useStaffStore() {
  const store = useContext(StaffContext);
  if (!store) throw new Error('useStaffStore() needs <StaffStoreProvider>');
  return store;
}
