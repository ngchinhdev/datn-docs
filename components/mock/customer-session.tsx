'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { useScheduleStore } from './schedule-store';
import type { Customer, CustomerPackage, CustomerWallet, ServedSubject } from '@/mock/fixtures';
import { walletView } from '@/mock/wallet-view';

export interface CustomerSessionValue {
  customer: Customer | null;
  customerId: string | null;
  isLoggedIn: boolean;
  /** The email they logged in with; a customer record may not exist yet (BR-16). */
  email: string | null;
  subjects: ServedSubject[];
  packages: CustomerPackage[];
  wallet: CustomerWallet;
  login: (email: string) => { ok: boolean; customerId?: string; isNew?: boolean };
  loginWithId: (id: string) => void;
  /** An email with no booking yet still logs in; its details appear after the first booking. */
  loginAsGuest: (email: string) => void;
  logout: () => void;
  updateProfile: (
    data: Partial<Pick<Customer, 'name' | 'phone' | 'email' | 'marketingOptIn'>>,
  ) => void;
}

const CustomerSessionContext = createContext<CustomerSessionValue | null>(null);

export function CustomerSessionProvider({
  tenantSlug,
  children,
}: {
  tenantSlug: string;
  children: ReactNode;
}) {
  const { customers, replaceCustomer, servedSubjects, money } = useScheduleStore();

  // Default customer for mock: Chị Quyên for toc-may, Chị Linh for pawpaw
  const defaultCustomerId = useMemo(() => {
    if (tenantSlug === 'toc-may') {
      return customers.find((c) => c.id === 'may-c-quyen')?.id ?? customers[0]?.id ?? null;
    }
    if (tenantSlug === 'pawpaw') {
      return customers.find((c) => c.id === 'paw-c-linh')?.id ?? customers[0]?.id ?? null;
    }
    return customers[0]?.id ?? null;
  }, [tenantSlug, customers]);

  const [currentId, setCurrentId] = useState<string | null>(defaultCustomerId);
  const [guestEmail, setGuestEmail] = useState<string | null>(null);

  const customer = useMemo(() => {
    if (!currentId) return null;
    return customers.find((c) => c.id === currentId) ?? null;
  }, [currentId, customers]);

  const subjects = useMemo(() => {
    if (!currentId) return [];
    return servedSubjects.filter((s) => s.customerId === currentId);
  }, [currentId, servedSubjects]);

  const packages = useMemo(() => {
    return customer?.packages ?? [];
  }, [customer]);

  const wallet = useMemo(
    () => walletView(money.walletEntries, currentId ?? ''),
    [money.walletEntries, currentId],
  );

  const login = useCallback(
    (email: string) => {
      const normalized = email.trim().toLowerCase();
      const found = customers.find((c) => c.email?.toLowerCase() === normalized);
      if (found) {
        setCurrentId(found.id);
        setGuestEmail(null);
        return { ok: true, customerId: found.id, isNew: false };
      }
      return { ok: false, isNew: true };
    },
    [customers],
  );

  const loginWithId = useCallback((id: string) => {
    setCurrentId(id);
    setGuestEmail(null);
  }, []);

  const loginAsGuest = useCallback((email: string) => {
    setCurrentId(null);
    setGuestEmail(email.trim());
  }, []);

  const logout = useCallback(() => {
    setCurrentId(null);
    setGuestEmail(null);
  }, []);

  const updateProfile = useCallback(
    (data: Partial<Pick<Customer, 'name' | 'phone' | 'email' | 'marketingOptIn'>>) => {
      if (!customer) return;
      const updated: Customer = {
        ...customer,
        ...data,
      };
      replaceCustomer(updated);
    },
    [customer, replaceCustomer],
  );

  const value = useMemo(
    () => ({
      customer,
      customerId: currentId,
      isLoggedIn: !!customer || guestEmail !== null,
      email: customer?.email ?? guestEmail,
      subjects,
      packages,
      wallet,
      login,
      loginWithId,
      loginAsGuest,
      logout,
      updateProfile,
    }),
    [
      customer,
      currentId,
      guestEmail,
      subjects,
      packages,
      wallet,
      login,
      loginWithId,
      loginAsGuest,
      logout,
      updateProfile,
    ],
  );

  return (
    <CustomerSessionContext.Provider value={value}>{children}</CustomerSessionContext.Provider>
  );
}

export function useCustomerSession() {
  const ctx = useContext(CustomerSessionContext);
  if (!ctx) throw new Error('useCustomerSession() needs <CustomerSessionProvider>');
  return ctx;
}
