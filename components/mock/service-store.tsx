'use client';

import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import { useTenantRoot } from '@/components/mock/tenant-root';
import { tenantFixtures, type Service } from '@/mock/fixtures';
import { deriveGroups, replaceService, toEnd } from '@/mock/service-settings';

interface ServiceStore {
  /** Every service of the tenant, in use or not; the order is the order inside each group. */
  services: Service[];
  /** The groups in order (BR-94.5); services with no group are under "Khác". */
  groups: string[];
  /** Replaces one service; one that changed group stands last in the new one (BR-94.11). */
  save: (service: Service) => void;
  /** Adds a service last of its group. */
  add: (service: Service) => void;
  /** Replaces the whole list: order, putting out of use, back in use. */
  setServices: (services: Service[]) => void;
  /** Sets the groups, and the services when the change reaches them (rename, delete). */
  setGroups: (groups: string[], services?: Service[]) => void;
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
  const {
    services: edited,
    serviceGroups,
    setServices: setRootServices,
    setServiceGroups,
  } = useTenantRoot();
  const services = edited[tenantSlug] ?? fixture.services;
  const groups = useMemo(
    () => serviceGroups[tenantSlug] ?? deriveGroups(fixture.services),
    [serviceGroups, tenantSlug, fixture.services],
  );

  const setServices = useCallback(
    (next: Service[]) => setRootServices(tenantSlug, next),
    [setRootServices, tenantSlug],
  );
  const save = useCallback(
    (service: Service) => setServices(replaceService(services, service)),
    [services, setServices],
  );
  const add = useCallback(
    (service: Service) => setServices(toEnd(services, service)),
    [services, setServices],
  );
  const setGroups = useCallback(
    (next: string[], nextServices?: Service[]) => {
      setServiceGroups(tenantSlug, next);
      if (nextServices) setServices(nextServices);
    },
    [setServiceGroups, setServices, tenantSlug],
  );

  const value = useMemo(
    () => ({ services, groups, save, add, setServices, setGroups }),
    [services, groups, save, add, setServices, setGroups],
  );
  return <ServiceContext.Provider value={value}>{children}</ServiceContext.Provider>;
}

export function useServiceStore() {
  const store = useContext(ServiceContext);
  if (!store) throw new Error('useServiceStore() needs <ServiceStoreProvider>');
  return store;
}
