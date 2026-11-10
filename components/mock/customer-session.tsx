'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { useScheduleStore } from './schedule-store';
import type { Customer, CustomerPackage, CustomerWallet, ServedSubject } from '@/mock/fixtures';

export interface CustomerSessionValue {
  customer: Customer | null;
  customerId: string | null;
  isLoggedIn: boolean;
  subjects: ServedSubject[];
  packages: CustomerPackage[];
  wallet: CustomerWallet;
  login: (email: string) => { ok: boolean; customerId?: string; isNew?: boolean };
  loginWithId: (id: string) => void;
  logout: () => void;
  updateProfile: (data: Partial<Pick<Customer, 'name' | 'phone' | 'email'>>) => void;
}

const CustomerSessionContext = createContext<CustomerSessionValue | null>(null);

const emptyWallet: CustomerWallet = {
  balanceVnd: 0n,
  realVnd: 0n,
  bonusVnd: 0n,
  history: [],
};

export function CustomerSessionProvider({
  tenantSlug,
  children,
}: {
  tenantSlug: string;
  children: ReactNode;
}) {
  const { customers, replaceCustomer, servedSubjects } = useScheduleStore();

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

  const wallet = useMemo(() => {
    return customer?.wallet ?? emptyWallet;
  }, [customer]);

  const login = useCallback(
    (email: string) => {
      const normalized = email.trim().toLowerCase();
      const found = customers.find((c) => c.email?.toLowerCase() === normalized);
      if (found) {
        setCurrentId(found.id);
        return { ok: true, customerId: found.id, isNew: false };
      }
      return { ok: false, isNew: true };
    },
    [customers],
  );

  const loginWithId = useCallback((id: string) => {
    setCurrentId(id);
  }, []);

  const logout = useCallback(() => {
    setCurrentId(null);
  }, []);

  const updateProfile = useCallback(
    (data: Partial<Pick<Customer, 'name' | 'phone' | 'email'>>) => {
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
      isLoggedIn: !!customer,
      subjects,
      packages,
      wallet,
      login,
      loginWithId,
      logout,
      updateProfile,
    }),
    [customer, currentId, subjects, packages, wallet, login, loginWithId, logout, updateProfile],
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
