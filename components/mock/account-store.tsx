'use client';

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import {
  accounts as seedAccounts,
  invitations as seedInvitations,
  members as seedMembers,
  workspaces,
  type Account,
  type Invitation,
  type Member,
  type Workspace,
} from '@/mock/fixtures/accounts';

interface AccountStore {
  accounts: Account[];
  /** Who works where, with what role (BR-78). */
  members: Member[];
  invitations: Invitation[];
}

const AccountContext = createContext<AccountStore | null>(null);

/**
 * Accounts of every tenant, above the pages of `/mock`, so the sign-in pages, the invitation pages
 * and the staff screen share them. Nothing is saved: a reload starts from the sample data.
 */
export function AccountProvider({ children }: { children: ReactNode }) {
  const [accounts] = useState<Account[]>(seedAccounts);
  const [members] = useState<Member[]>(seedMembers);
  const [invitations] = useState<Invitation[]>(seedInvitations);
  const value = useMemo(
    () => ({ accounts, members, invitations }),
    [accounts, members, invitations],
  );
  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccountStore(): AccountStore {
  const store = useContext(AccountContext);
  if (!store) throw new Error('useAccountStore() needs <AccountProvider>');
  return store;
}

export const workspaceBySlug = (slug: string): Workspace | undefined =>
  workspaces.find((w) => w.slug === slug);
