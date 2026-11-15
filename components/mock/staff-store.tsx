'use client';

import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import { useAccountStore } from '@/components/mock/account-store';
import { useTenantRoot } from '@/components/mock/tenant-root';
import { tenantFixtures, type Staff } from '@/mock/fixtures';

interface StaffStore {
  staff: Staff[];
  /** Replaces one member of staff. */
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
  const root = useTenantRoot();
  const edited = root.staff[tenantSlug];
  const staff = useMemo(() => {
    const joined = joiners[tenantSlug] ?? [];
    if (!edited) return [...fixture.staff, ...joined];
    // Someone who joined after the last edit still shows up.
    return [...edited, ...joined.filter((j) => !edited.some((s) => s.resourceId === j.resourceId))];
  }, [edited, fixture, joiners, tenantSlug]);
  const { setStaff } = root;
  const save = useCallback(
    (member: Staff) => {
      setStaff(
        tenantSlug,
        staff.map((s) => (s.resourceId === member.resourceId ? member : s)),
      );
    },
    [setStaff, staff, tenantSlug],
  );
  const value = useMemo(() => ({ staff, save }), [staff, save]);
  return <StaffContext.Provider value={value}>{children}</StaffContext.Provider>;
}

export function useStaffStore() {
  const store = useContext(StaffContext);
  if (!store) throw new Error('useStaffStore() needs <StaffStoreProvider>');
  return store;
}
