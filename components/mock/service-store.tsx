'use client';

import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import { useTenantRoot } from '@/components/mock/tenant-root';
import { tenantFixtures, type Service } from '@/mock/fixtures';

interface ServiceStore {
  services: Service[];
  /** Replaces one service. */
  save: (service: Service) => void;
}

const ServiceContext = createContext<ServiceStore | null>(null);

/** Services of the tenant being viewed, so an edit shows in the list and the detail at once. */
export function ServiceStoreProvider({
  tenantSlug,
  children,
}: {
  tenantSlug: string;
  children: ReactNode;
}) {
  const fixture = tenantFixtures.find((f) => f.tenant.slug === tenantSlug) ?? tenantFixtures[0]!;
  const { services: edited, setServices } = useTenantRoot();
  const services = edited[tenantSlug] ?? fixture.services;
  const save = useCallback(
    (service: Service) => {
      setServices(
        tenantSlug,
        services.map((s) => (s.id === service.id ? service : s)),
      );
    },
    [setServices, services, tenantSlug],
  );
  const value = useMemo(() => ({ services, save }), [services, save]);
  return <ServiceContext.Provider value={value}>{children}</ServiceContext.Provider>;
}

export function useServiceStore() {
  const store = useContext(ServiceContext);
  if (!store) throw new Error('useServiceStore() needs <ServiceStoreProvider>');
  return store;
}
