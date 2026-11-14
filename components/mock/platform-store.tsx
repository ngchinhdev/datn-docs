'use client';

import { useSearchParams } from 'next/navigation';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { useAccountStore } from '@/components/mock/account-store';
import {
  SEED_LOG,
  platformTenants,
  type PlatformLogEntry,
  type PlatformPayment,
  type PlatformTenant,
} from '@/mock/fixtures/platform';
import { tenantView, type TenantView } from '@/mock/platform';
import {
  DEFAULT_CATALOG,
  mockSubscription,
  planOverrideOf,
  type Catalog,
  type Subscription,
} from '@/mock/subscription';

interface PlatformData {
  /** The two plans and the discount of each period, as the admin left them (BR-83). */
  catalog: Catalog;
  /** What each tenant holds, by tenant id; an extension moves the date here. */
  subscriptions: Record<string, Subscription>;
  /** Payments of each tenant, newest first, manual extensions included. */
  payments: Record<string, PlatformPayment[]>;
  /** What the admin did, oldest first (BR-63). */
  log: PlatformLogEntry[];
}

const INITIAL: PlatformData = {
  catalog: DEFAULT_CATALOG,
  subscriptions: Object.fromEntries(platformTenants.map((t) => [t.id, t.subscription])),
  payments: Object.fromEntries(platformTenants.map((t) => [t.id, t.payments])),
  log: SEED_LOG,
};

interface PlatformStore extends PlatformData {
  tenants: PlatformTenant[];
  /** Changes some of the data; `fn` gets the current data, so two changes in a row both land. */
  patch: (fn: (data: PlatformData) => Partial<PlatformData>) => void;
  /** The subscription the platform holds for a tenant of the mock, by its address; `undefined` for any other. */
  subscriptionBySlug: (slug: string) => Subscription | undefined;
  /** Payments the platform holds for a tenant of the mock, by its address. */
  paymentsBySlug: (slug: string) => PlatformPayment[] | undefined;
}

const PlatformContext = createContext<PlatformStore | null>(null);

/**
 * The platform side of the sample data, above every page of `/mock`: the plans and prices, what each
 * tenant holds, the admin's log. The tenant pages read the same plans and dates the admin edits.
 * Nothing is saved: a reload starts from the sample data.
 */
export function PlatformProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<PlatformData>(INITIAL);
  const patch = useCallback(
    (fn: (data: PlatformData) => Partial<PlatformData>) => setData((d) => ({ ...d, ...fn(d) })),
    [],
  );
  const value = useMemo<PlatformStore>(() => {
    const byId = (slug: string) => platformTenants.find((t) => t.slug === slug)?.id;
    return {
      ...data,
      tenants: platformTenants,
      patch,
      subscriptionBySlug: (slug) => {
        const id = byId(slug);
        return id ? data.subscriptions[id] : undefined;
      },
      paymentsBySlug: (slug) => {
        const id = byId(slug);
        return id ? data.payments[id] : undefined;
      },
    };
  }, [data, patch]);
  return <PlatformContext.Provider value={value}>{children}</PlatformContext.Provider>;
}

export function usePlatform(): PlatformStore {
  const store = useContext(PlatformContext);
  if (!store) throw new Error('usePlatform() needs <PlatformProvider>');
  return store;
}

/** Every tenant as the platform sees it on the mock clock; a lock is the account store's (BR-75). */
export function useTenantViews(): TenantView[] {
  const { tenants, subscriptions } = usePlatform();
  const { locks, now } = useAccountStore();
  return useMemo(
    () =>
      tenants.map((t) =>
        tenantView(t, subscriptions[t.id] ?? t.subscription, locks[t.id] ?? null, now),
      ),
    [tenants, subscriptions, locks, now],
  );
}

/**
 * The plan of a tenant for the customer pages, which do not mount the admin area's provider: the
 * platform's own subscription, with the `?plan=` and `?periodEnd=` overrides of the mock.
 */
export function useTenantSubscription(tenantSlug: string) {
  const query = useSearchParams();
  const { catalog, subscriptionBySlug } = usePlatform();
  const subscription = mockSubscription(
    tenantSlug,
    planOverrideOf(query.get('plan')),
    query.get('periodEnd'),
    subscriptionBySlug(tenantSlug),
  );
  return { subscription, catalog };
}
