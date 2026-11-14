'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { AccountMail } from '@/mock/account-mail';
import type { LoginRecords, ResetToken } from '@/mock/account';
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
import type { Staff } from '@/mock/fixtures';
import { SEED_LOCKS } from '@/mock/fixtures/platform';
import { addMinutes, MOCK_NOW } from '@/mock/time';

interface AccountData {
  accounts: Account[];
  /** Who works where, with what role (BR-78). */
  members: Member[];
  invitations: Invitation[];
  /** Who is signed in; `null` is nobody. */
  session: { accountId: string; persistent: boolean } | null;
  /** Minutes the mock clock has run on from `MOCK_NOW`. */
  offsetMinutes: number;
  records: LoginRecords;
  resetTokens: ResetToken[];
  /** When each email last asked for a reset link, ISO 8601, UTC. */
  resetSentAt: Record<string, string>;
  /** The sample mailbox, newest last. */
  mails: AccountMail[];
  /** The tenant each account used last (`last_tenant_id`). */
  lastWorkspace: Record<string, string>;
  /** Staff made by accepting an invitation, by tenant slug: they join the staff list of the app. */
  joiners: Record<string, Staff[]>;
  /** Tenants the platform has locked, by workspace id: when, and why (BR-75). */
  locks: Record<string, { at: string; reason: string }>;
  /** When the realtime link went down; `null` while it is up. The calendar says so (BR-79). */
  offlineSince: string | null;
}

const INITIAL: AccountData = {
  accounts: seedAccounts,
  members: seedMembers,
  invitations: seedInvitations,
  session: null,
  offsetMinutes: 0,
  records: {},
  resetTokens: [],
  resetSentAt: {},
  mails: [],
  lastWorkspace: { 'acc-linh': 'may' },
  joiners: {},
  locks: SEED_LOCKS,
  offlineSince: null,
};

interface AccountStore extends AccountData {
  /** The mock clock: it stands at `MOCK_NOW` until a tool moves it on. */
  now: string;
  /** Changes some of the data; `fn` gets the current data, so two changes in a row both land. */
  patch: (fn: (data: AccountData) => Partial<AccountData>) => void;
  advance: (minutes: number) => void;
  /** The signed-in account, or `undefined`. */
  signedIn: Account | undefined;
}

const AccountContext = createContext<AccountStore | null>(null);

/**
 * Accounts of every tenant, above the pages of `/mock`, so the sign-in pages, the invitation pages
 * and the staff screen share them. Nothing is saved: a reload starts from the sample data.
 */
export function AccountProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AccountData>(INITIAL);
  const patch = useCallback(
    (fn: (data: AccountData) => Partial<AccountData>) => setData((d) => ({ ...d, ...fn(d) })),
    [],
  );
  const advance = useCallback(
    (minutes: number) => setData((d) => ({ ...d, offsetMinutes: d.offsetMinutes + minutes })),
    [],
  );
  const value = useMemo<AccountStore>(
    () => ({
      ...data,
      now: addMinutes(MOCK_NOW, data.offsetMinutes),
      patch,
      advance,
      signedIn: data.accounts.find((a) => a.id === data.session?.accountId),
    }),
    [data, patch, advance],
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
