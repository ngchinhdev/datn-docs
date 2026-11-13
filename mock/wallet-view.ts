/*
 * The wallet as the customer pages and the profile screen show it: the balance and the ledger
 * written as lines of text. Pure.
 */
import type { CustomerWallet, WalletEntry } from './fixtures/types.ts';
import { formatVnd } from './format.ts';
import { walletBalance } from './money.ts';
import { localDate } from './time.ts';

/** `+1.000.000 ₫`, `−150.000 ₫`. */
export const signedVnd = (amount: bigint) =>
  `${amount < 0n ? '−' : '+'}${formatVnd(amount < 0n ? -amount : amount)}`;

/** `07/11`. */
export const dayMonth = (iso: string) => {
  const date = localDate(iso);
  return `${date.slice(8, 10)}/${date.slice(5, 7)}`;
};

/** What one entry moved: real money, then bonus, `+1.000.000 ₫ · +100.000 ₫`. */
export const entryAmountText = (e: WalletEntry) =>
  [e.realVnd, e.bonusVnd]
    .filter((v) => v !== 0n)
    .map(signedVnd)
    .join(' · ') || formatVnd(0n);

/** Newest entry first. */
export function ledgerOf(entries: readonly WalletEntry[], customerId: string): WalletEntry[] {
  return entries
    .filter((e) => e.customerId === customerId)
    .sort((a, b) => b.at.localeCompare(a.at));
}

export function walletView(entries: readonly WalletEntry[], customerId: string): CustomerWallet {
  const { realVnd, bonusVnd, balanceVnd } = walletBalance(entries, customerId);
  return {
    balanceVnd,
    realVnd,
    bonusVnd,
    history: ledgerOf(entries, customerId).map((e) => ({
      id: e.id,
      date: dayMonth(e.at),
      description: e.memo,
      amountText: entryAmountText(e),
      isPositive: e.realVnd + e.bonusVnd > 0n,
    })),
  };
}
