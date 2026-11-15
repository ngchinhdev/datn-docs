'use client';

import { useSearchParams } from 'next/navigation';
import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import { usePlatform } from '@/components/mock/platform-store';
import { useTenantRoot } from '@/components/mock/tenant-root';
import {
  canBook,
  can,
  daysLeft,
  endsOn,
  entitlements,
  mockSubscription,
  planOverrideOf,
  purchase,
  seedPayments,
  type Catalog,
  type Entitlements,
  type FeatureCode,
  type Payment,
  type Purchase,
  type Subscription,
} from '@/mock/subscription';
import { MOCK_NOW, MOCK_TODAY } from '@/mock/time';

interface SubscriptionStore {
  subscription: Subscription;
  entitlements: Entitlements;
  /** Days left of the trial or the period, counting today; `null` when neither runs. */
  daysLeft: number | null;
  payments: Payment[];
  /** Active branches of the tenant; `?branches=3` tries the downgrade block (BR-85). */
  branches: number;
  can: (feature: FeatureCode) => boolean;
  canBook: boolean;
  /** Applies a purchase to the page state and adds its row to the history. */
  buy: (p: Purchase) => Subscription;
}

const SubscriptionContext = createContext<SubscriptionStore | null>(null);

function Provider({
  tenantSlug,
  scenario,
  initial,
  initialPayments,
  catalog,
  branches,
  children,
}: {
  tenantSlug: string;
  scenario: string;
  initial: Subscription;
  initialPayments: Payment[];
  catalog: Catalog;
  branches: number;
  children: ReactNode;
}) {
  const { plans, setPlan } = useTenantRoot();
  // What the root holds counts only while it belongs to the scenario on screen.
  const held = plans[tenantSlug]?.key === scenario ? plans[tenantSlug] : undefined;
  const subscription = held?.subscription ?? initial;
  const payments = held?.payments ?? initialPayments;

  const buy = useCallback(
    (p: Purchase) => {
      const result = purchase(subscription, p, MOCK_TODAY, catalog);
      // Newest first, as a history reads.
      setPlan(tenantSlug, {
        key: scenario,
        subscription: result.subscription,
        payments: [result.payment, ...payments],
      });
      return result.subscription;
    },
    [subscription, payments, catalog, setPlan, tenantSlug, scenario],
  );

  const value = useMemo<SubscriptionStore>(() => {
    const e = entitlements(subscription, MOCK_NOW, catalog);
    const end = endsOn(e);
    return {
      subscription,
      entitlements: e,
      daysLeft: end ? daysLeft(end, MOCK_TODAY) : null,
      payments,
      branches,
      can: (feature) => can(e, feature),
      canBook: canBook(e),
      buy,
    };
  }, [subscription, payments, branches, buy, catalog]);

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}

/**
 * The plan of the tenant being viewed: what the platform holds for it, or what `?plan=` and
 * `?periodEnd=` say instead (BR-80 to BR-87). A simulated payment changes every
 * screen at once; a new `?plan=` or a date the platform moved starts over.
 */
export function SubscriptionProvider({
  tenantSlug,
  children,
}: {
  tenantSlug: string;
  children: ReactNode;
}) {
  const query = useSearchParams();
  const { catalog, subscriptionBySlug, paymentsBySlug } = usePlatform();
  const plan = planOverrideOf(query.get('plan'));
  const periodEnd = query.get('periodEnd');
  const branches = Math.max(1, Number(query.get('branches')) || 1);
  const held = subscriptionBySlug(tenantSlug);
  const initial = mockSubscription(tenantSlug, plan, periodEnd, held);
  // The history is the platform's while the tenant shows its own plan; an override has no history of its own.
  const overridden = plan !== null || periodEnd !== null;
  const heldPayments = overridden ? undefined : paymentsBySlug(tenantSlug);
  return (
    <Provider
      tenantSlug={tenantSlug}
      // A different override, or a date the platform moved, is a different scenario.
      scenario={`${plan}|${periodEnd}|${JSON.stringify(initial)}`}
      initial={initial}
      initialPayments={heldPayments ?? seedPayments(initial)}
      catalog={catalog}
      branches={branches}
    >
      {children}
    </Provider>
  );
}

export function useSubscription() {
  const store = useContext(SubscriptionContext);
  if (!store) throw new Error('useSubscription() needs <SubscriptionProvider>');
  return store;
}
