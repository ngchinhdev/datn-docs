'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { tenantFixtures, type Service } from '@/mock/fixtures';

interface ServiceStore {
  services: Service[];
  /** Replaces one service; lives in page state, nothing is saved. */
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
  const [services, setServices] = useState(fixture.services);
  const save = useCallback((service: Service) => {
    setServices((list) => list.map((s) => (s.id === service.id ? service : s)));
  }, []);
  const value = useMemo(() => ({ services, save }), [services, save]);
  return <ServiceContext.Provider value={value}>{children}</ServiceContext.Provider>;
}

export function useServiceStore() {
  const store = useContext(ServiceContext);
  if (!store) throw new Error('useServiceStore() needs <ServiceStoreProvider>');
  return store;
}
