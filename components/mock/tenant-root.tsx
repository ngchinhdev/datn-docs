'use client';

import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import { usePersistedState } from '@/components/mock/use-persisted-state';
import type { Service, Staff } from '@/mock/fixtures';
import type { Payment, Subscription } from '@/mock/subscription';

/** The plan of one tenant as the page last changed it; `key` names the scenario it belongs to. */
export interface HeldPlan {
  key: string;
  subscription: Subscription;
  payments: Payment[];
}

interface TenantRoot {
  /** Staff lists changed by an edit, by tenant slug; a tenant with no edit is absent. */
  staff: Record<string, Staff[]>;
  services: Record<string, Service[]>;
  /** Service group names in order, by tenant slug (BR-94.5); a tenant with no edit is absent. */
  serviceGroups: Record<string, string[]>;
  plans: Record<string, HeldPlan>;
  setStaff: (slug: string, list: Staff[]) => void;
  setServices: (slug: string, list: Service[]) => void;
  setServiceGroups: (slug: string, list: string[]) => void;
  setPlan: (slug: string, plan: HeldPlan) => void;
}

const TenantRootContext = createContext<TenantRoot | null>(null);

/**
 * Staff, services and plan of every tenant, above the pages of `/mock`, so the staff area and the
 * customer site read one copy of each tenant.
 */
export function TenantRootProvider({ children }: { children: ReactNode }) {
  const [staff, setStaffMap] = usePersistedState<Record<string, Staff[]>>('tenant-staff', {});
  const [services, setServicesMap] = usePersistedState<Record<string, Service[]>>(
    'tenant-services',
    {},
  );
  const [serviceGroups, setServiceGroupsMap] = usePersistedState<Record<string, string[]>>(
    'tenant-service-groups',
    {},
  );
  const [plans, setPlans] = usePersistedState<Record<string, HeldPlan>>('tenant-plans', {});

  const setStaff = useCallback(
    (slug: string, list: Staff[]) => setStaffMap((m) => ({ ...m, [slug]: list })),
    [],
  );
  const setServices = useCallback(
    (slug: string, list: Service[]) => setServicesMap((m) => ({ ...m, [slug]: list })),
    [],
  );
  const setServiceGroups = useCallback(
    (slug: string, list: string[]) => setServiceGroupsMap((m) => ({ ...m, [slug]: list })),
    [],
  );
  const setPlan = useCallback(
    (slug: string, plan: HeldPlan) => setPlans((m) => ({ ...m, [slug]: plan })),
    [],
  );

  const value = useMemo(
    () => ({
      staff,
      services,
      serviceGroups,
      plans,
      setStaff,
      setServices,
      setServiceGroups,
      setPlan,
    }),
    [staff, services, serviceGroups, plans, setStaff, setServices, setServiceGroups, setPlan],
  );
  return <TenantRootContext.Provider value={value}>{children}</TenantRootContext.Provider>;
}

export function useTenantRoot(): TenantRoot {
  const root = useContext(TenantRootContext);
  if (!root) throw new Error('useTenantRoot() needs <TenantRootProvider>');
  return root;
}
