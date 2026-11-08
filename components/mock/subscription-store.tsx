'use client';

import { useSearchParams } from 'next/navigation';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import {
  PLAN_NOW,
  PLAN_TODAY,
  canBook,
  can,
  daysLeft,
  endsOn,
  entitlements,
  mockSubscription,
  planOverrideOf,
  purchase,
  seedPayments,
  type Entitlements,
  type FeatureCode,
  type Payment,
  type Purchase,
  type Subscription,
} from '@/mock/subscription';

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
  initial,
  branches,
  children,
}: {
  initial: Subscription;
  branches: number;
  children: ReactNode;
}) {
  const [subscription, setSubscription] = useState(initial);
  const [payments, setPayments] = useState(() => seedPayments(initial));

  const buy = useCallback(
    (p: Purchase) => {
      const result = purchase(subscription, p, PLAN_TODAY);
      setSubscription(result.subscription);
      // Newest first, as a history reads.
      setPayments((list) => [result.payment, ...list]);
      return result.subscription;
    },
    [subscription],
  );

  const value = useMemo<SubscriptionStore>(() => {
    const e = entitlements(subscription, PLAN_NOW);
    const end = endsOn(e);
    return {
      subscription,
      entitlements: e,
      daysLeft: end ? daysLeft(end, PLAN_TODAY) : null,
      payments,
      branches,
      can: (feature) => can(e, feature),
      canBook: canBook(e),
      buy,
    };
  }, [subscription, payments, branches, buy]);

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}

/**
 * The plan of the tenant being viewed, from `?plan=` and `?periodEnd=` (BR-80 to BR-87). The state
 * lives for the page: a simulated payment changes every screen at once, a new `?plan=` starts over.
 */
export function SubscriptionProvider({
  tenantSlug,
  children,
}: {
  tenantSlug: string;
  children: ReactNode;
}) {
  const query = useSearchParams();
  const plan = planOverrideOf(query.get('plan'));
  const periodEnd = query.get('periodEnd');
  const branches = Math.max(1, Number(query.get('branches')) || 1);
  return (
    <Provider
      // A different override is a different scenario.
      key={`${tenantSlug}|${plan}|${periodEnd}`}
      initial={mockSubscription(tenantSlug, plan, periodEnd)}
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
