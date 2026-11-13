/*
 * The arithmetic of money: invoice totals, the wallet, refunds, packages, commission
 * (BR-20 to BR-29, BR-40, BR-42). Pure; imports types and the clock helpers only, so Node can run
 * it (scripts/check-money.ts). Every amount is integer VND, a `bigint`: no division leaves a
 * fraction, it rounds down.
 */
import type {
  Appointment,
  BonusTier,
  CommissionPeriod,
  CustomerPackage,
  Discount,
  Invoice,
  InvoiceLine,
  Payment,
  RefundRequest,
  Service,
  ServiceVariant,
  WalletEntry,
} from './fixtures/types.ts';
import { formatTime, localDate } from './time.ts';

const min = (a: bigint, b: bigint) => (a < b ? a : b);
const max = (a: bigint, b: bigint) => (a > b ? a : b);
const sum = (values: Iterable<bigint>) => {
  let total = 0n;
  for (const v of values) total += v;
  return total;
};

/** What the line is worth before a package session is applied. */
export const lineGross = (line: InvoiceLine) => BigInt(line.quantity) * line.unitPriceVnd;

/** A line that takes a package session is worth 0 (BR-22). */
export const lineAmount = (line: InvoiceLine) => (line.packageId ? 0n : lineGross(line));

/** BR-22: only by hand, a percentage of what is left after the sessions, or an amount; never above it. */
export function discountAmount(discount: Discount | undefined, base: bigint): bigint {
  if (!discount || base <= 0n) return 0n;
  if (discount.kind === 'percent') {
    return (base * BigInt(Math.min(100, Math.max(0, discount.percent)))) / 100n;
  }
  return min(max(discount.amountVnd, 0n), base);
}

export interface InvoiceTotals {
  /** Every line at its price, package sessions included ("Tạm tính"). */
  subtotal: bigint;
  /** Worth of the lines that took a package session. */
  packageUsed: bigint;
  discount: bigint;
  /** What the invoice is worth once the discount is off. */
  afterDiscount: bigint;
  /** The part of the deposit taken off; never more than the invoice is worth. */
  depositApplied: bigint;
  /** Deposit left over after the invoice is covered; it goes back to the customer. */
  depositUnused: bigint;
  /** "Còn phải thu". */
  due: bigint;
}

/** BR-22, in this order: price, package sessions (the line becomes 0), discount, deposit, amount due. */
export function invoiceTotals(
  lines: readonly InvoiceLine[],
  discount: Discount | undefined,
  deposit: bigint,
): InvoiceTotals {
  const subtotal = sum(lines.map(lineGross));
  const net = sum(lines.map(lineAmount));
  const off = discountAmount(discount, net);
  const afterDiscount = net - off;
  const depositApplied = min(deposit, afterDiscount);
  return {
    subtotal,
    packageUsed: subtotal - net,
    discount: off,
    afterDiscount,
    depositApplied,
    depositUnused: deposit - depositApplied,
    due: afterDiscount - depositApplied,
  };
}

/** The amount typed in a field, `1.000.000` or `1000000`; `null` when it is not a whole number. */
export function parseVnd(text: string): bigint | null {
  const digits = text.replace(/[\s.,₫đ]/g, '');
  return /^\d{1,15}$/.test(digits) ? BigInt(digits) : null;
}

/** Cash: what goes back to the customer (BR-21). */
export const cashChange = (tendered: bigint, amount: bigint) => max(0n, tendered - amount);

/** BR-21: the payments must add up to the amount due before the invoice can be collected. */
export function settlementGap(
  due: bigint,
  paid: bigint,
): { kind: 'ok' | 'short' | 'over'; gapVnd: bigint } {
  if (paid === due) return { kind: 'ok', gapVnd: 0n };
  return paid < due ? { kind: 'short', gapVnd: due - paid } : { kind: 'over', gapVnd: paid - due };
}

// --- Wallet (BR-20, BR-25) -------------------------------------------------------------------

export interface WalletBalance {
  realVnd: bigint;
  bonusVnd: bigint;
  balanceVnd: bigint;
}

/** The balance is the sum of the entries, nothing else (BR-20). */
export function walletBalance(entries: readonly WalletEntry[], customerId: string): WalletBalance {
  let realVnd = 0n;
  let bonusVnd = 0n;
  for (const e of entries) {
    if (e.customerId !== customerId) continue;
    realVnd += e.realVnd;
    bonusVnd += e.bonusVnd;
  }
  return { realVnd, bonusVnd, balanceVnd: realVnd + bonusVnd };
}

/** BR-25: paying with the wallet takes real money first, the bonus after. */
export function splitWallet(
  amount: bigint,
  real: bigint,
  bonus: bigint,
): { realVnd: bigint; bonusVnd: bigint; shortVnd: bigint } {
  if (amount < 0n) throw new RangeError('amount must not be negative');
  const realVnd = min(amount, max(real, 0n));
  const bonusVnd = min(amount - realVnd, max(bonus, 0n));
  return { realVnd, bonusVnd, shortVnd: amount - realVnd - bonusVnd };
}

/** BR-25: the bonus of the highest tier the amount reaches; none below the lowest. */
export function topupBonus(amount: bigint, tiers: readonly BonusTier[]): bigint {
  const tier = [...tiers]
    .filter((t) => amount >= t.minVnd)
    .sort((a, b) => (a.minVnd < b.minVnd ? 1 : -1))[0];
  return tier ? (amount * BigInt(tier.percent)) / 100n : 0n;
}

// --- Refunds (BR-27, BR-28) ------------------------------------------------------------------

/** Requests that already hold part of a payment: waiting, approved or automatic (BR-28). */
const holdsMoney = (r: RefundRequest) => r.status !== 'rejected';

export interface Refundable {
  /** What can still be asked back from this payment. */
  maxVnd: bigint;
  /** Why nothing can be asked, in words for the dialog; `null` when something can. */
  blocked: string | null;
}

/**
 * BR-28: the most a payment can give back is what it brought in minus what was already refunded
 * or is waiting to be. A deposit that was taken off the invoice has been used, so only the part
 * left over can go back; the rest is refunded through another payment.
 */
export function refundable(
  invoice: Invoice,
  payment: Payment,
  refunds: readonly RefundRequest[],
): Refundable {
  if (payment.status !== 'paid') return { maxVnd: 0n, blocked: 'Tiền của khoản này chưa về.' };
  const held = sum(
    refunds.filter((r) => r.paymentId === payment.id && holdsMoney(r)).map((r) => r.amountVnd),
  );
  let usable = payment.amountVnd;
  if (payment.purpose === 'deposit') {
    usable -= invoiceTotals(invoice.lines, invoice.discount, invoice.depositVnd).depositApplied;
  }
  // Once the invoice is collected, what the deposit did not cover is already in the wallet.
  if (payment.purpose === 'deposit' && invoice.paidAt) {
    return {
      maxVnd: 0n,
      blocked:
        usable < payment.amountVnd && invoice.depositVnd > usable
          ? 'Cọc đã trừ vào dịch vụ, phần thừa đã chuyển vào ví; hoàn qua khoản khác.'
          : 'Cọc đã trừ vào dịch vụ đã làm; hoàn qua khoản khác.',
    };
  }
  const left = max(0n, usable - held);
  if (left > 0n) return { maxVnd: left, blocked: null };
  return {
    maxVnd: 0n,
    blocked:
      payment.purpose === 'deposit' && usable <= 0n
        ? 'Cọc đã trừ vào dịch vụ đã làm; hoàn qua khoản khác.'
        : 'Khoản này đã hoàn hết.',
  };
}

/**
 * BR-28: money goes back the way it came. A wallet payment returns to the wallet keeping the
 * ratio of real money to bonus that is still left of it.
 */
export function splitWalletRefund(
  payment: Payment,
  refunds: readonly RefundRequest[],
  amount: bigint,
): { realVnd: bigint; bonusVnd: bigint } {
  const done = refunds.filter((r) => r.paymentId === payment.id && r.status === 'approved');
  const leftReal = (payment.realVnd ?? 0n) - sum(done.map((r) => r.walletRealVnd ?? 0n));
  const leftBonus = (payment.bonusVnd ?? 0n) - sum(done.map((r) => r.walletBonusVnd ?? 0n));
  const total = leftReal + leftBonus;
  if (total <= 0n) return { realVnd: 0n, bonusVnd: 0n };
  let realVnd = (amount * leftReal) / total;
  let bonusVnd = amount - realVnd;
  if (bonusVnd > leftBonus) {
    bonusVnd = leftBonus;
    realVnd = amount - bonusVnd;
  }
  return { realVnd, bonusVnd };
}

/** BR-27: package price, minus the sessions used at the retail price of the day it was bought, minus the fee; never below 0. */
export function packageRefund(
  priceVnd: bigint,
  unitPriceVnd: bigint,
  usedSessions: number,
  feeVnd: bigint,
): bigint {
  return max(0n, priceVnd - BigInt(usedSessions) * unitPriceVnd - feeVnd);
}

/**
 * BR-26: a package earns revenue one session at a time, `price / total` rounded down; the last
 * session takes what the rounding left.
 */
export function sessionRevenue(priceVnd: bigint, totalSessions: number, sessionNo: number): bigint {
  const each = priceVnd / BigInt(totalSessions);
  return sessionNo >= totalSessions ? priceVnd - each * BigInt(totalSessions - 1) : each;
}

/** `dd/MM/yyyy` of the last day a package bought at `now` can be used. */
export function packageExpiry(now: string, validDays: number): string {
  const day = new Date(Date.parse(`${localDate(now)}T00:00:00Z`) + validDays * 86_400_000);
  const iso = day.toISOString().slice(0, 10);
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}

const expiryDate = (text: string) => `${text.slice(6, 10)}-${text.slice(3, 5)}-${text.slice(0, 2)}`;

/** Whether a session of the package can be taken for this service now. */
export function packageUsable(pkg: CustomerPackage, variantId: string, now: string): boolean {
  return (
    !pkg.refunded &&
    pkg.remainingSessions > 0 &&
    pkg.serviceVariantId === variantId &&
    expiryDate(pkg.expiresAt) >= localDate(now)
  );
}

// --- Commission (BR-40, BR-42) ---------------------------------------------------------------

export interface StaffAmount {
  staffResourceId: string;
  amountVnd: bigint;
}

/** What each line is worth after its share of the discount; the base of commission (BR-40). */
function netByLine(lines: readonly InvoiceLine[], discount: bigint) {
  const net = sum(lines.map(lineAmount));
  return lines.map((line) => {
    const own = lineAmount(line);
    return { line, net: net > 0n ? own - (discount * own) / net : 0n };
  });
}

function addTo(list: StaffAmount[], staffResourceId: string, amountVnd: bigint) {
  const found = list.find((e) => e.staffResourceId === staffResourceId);
  if (found) found.amountVnd += amountVnd;
  else list.push({ staffResourceId, amountVnd });
}

/** BR-40: commission is `percent` of what was really collected for each person's lines, after the discount. */
export function commissionEarned(
  lines: readonly InvoiceLine[],
  discount: bigint,
  percent: number,
): StaffAmount[] {
  const out: StaffAmount[] = [];
  for (const { line, net } of netByLine(lines, discount)) {
    if (!line.staffResourceId || net <= 0n) continue;
    addTo(out, line.staffResourceId, (net * BigInt(percent)) / 100n);
  }
  return out;
}

/**
 * BR-26, BR-40: a package session is worth its revenue, `price / sessions`; the person who did it
 * earns commission on that, not on the 0 ₫ the line is collected for.
 */
export function packageSessionCommission(
  lines: readonly InvoiceLine[],
  percent: number,
): StaffAmount[] {
  const out: StaffAmount[] = [];
  for (const line of lines) {
    if (!line.packageId || !line.staffResourceId || !line.sessionRevenueVnd) continue;
    addTo(out, line.staffResourceId, (line.sessionRevenueVnd * BigInt(percent)) / 100n);
  }
  return out;
}

/**
 * BR-28, BR-42: a refund takes commission back as a negative posting in the open period, never in
 * a period that is closed. A refund about one line takes it from that line's person; otherwise
 * from everyone in proportion to what they earned.
 */
export function commissionClawback(input: {
  refundVnd: bigint;
  percent: number;
  lines: readonly InvoiceLine[];
  discountVnd: bigint;
  lineId?: string;
  periods: readonly CommissionPeriod[];
}): { entries: StaffAmount[]; period: CommissionPeriod } {
  const period = input.periods.find((p) => p.status === 'open');
  if (!period) throw new Error('no open commission period');
  const back = (input.refundVnd * BigInt(input.percent)) / 100n;
  const line = input.lines.find((l) => l.id === input.lineId);
  if (line?.staffResourceId) {
    return { entries: [{ staffResourceId: line.staffResourceId, amountVnd: -back }], period };
  }
  const shares = netByLine(input.lines, input.discountVnd).filter(
    (s) => s.line.staffResourceId && s.net > 0n,
  );
  const total = sum(shares.map((s) => s.net));
  const entries: StaffAmount[] = [];
  if (total > 0n) {
    for (const s of shares) addTo(entries, s.line.staffResourceId!, -((back * s.net) / total));
  }
  return { entries, period };
}

// --- Status of an invoice --------------------------------------------------------------------

export type InvoiceStatus =
  'draft' | 'awaiting_transfer' | 'paid' | 'refund_pending' | 'refunded_partial' | 'refunded';

export const invoiceStatusLabel: Record<InvoiceStatus, string> = {
  draft: 'Chưa thu',
  awaiting_transfer: 'Chờ tiền về',
  paid: 'Đã thu',
  refund_pending: 'Chờ duyệt hoàn',
  refunded_partial: 'Đã hoàn một phần',
  refunded: 'Đã hoàn',
};

/** Badge modifier of the Sapio `.sp-badge`. */
export const invoiceStatusBadge: Record<InvoiceStatus, string> = {
  draft: 'hold',
  awaiting_transfer: 'pending',
  paid: 'completed',
  refund_pending: 'no-show',
  refunded_partial: 'cancelled',
  refunded: 'cancelled',
};

/** What the customer paid for the invoice itself: the payments that came in, not the deposit. */
export function collectedVnd(invoice: Invoice, payments: readonly Payment[]): bigint {
  return sum(
    payments
      .filter((p) => p.invoiceId === invoice.id && p.purpose === 'invoice' && p.status === 'paid')
      .map((p) => p.amountVnd),
  );
}

export function invoiceStatus(
  invoice: Invoice,
  payments: readonly Payment[],
  refunds: readonly RefundRequest[],
): InvoiceStatus {
  const own = payments.filter((p) => p.invoiceId === invoice.id);
  if (own.some((p) => p.purpose === 'invoice' && p.status === 'pending'))
    return 'awaiting_transfer';
  if (!invoice.paidAt) return 'draft';
  const mine = refunds.filter((r) => r.invoiceId === invoice.id);
  if (mine.some((r) => r.status === 'pending')) return 'refund_pending';
  const given = sum(
    mine.filter((r) => r.status === 'approved' || r.status === 'auto').map((r) => r.amountVnd),
  );
  if (given <= 0n) return 'paid';
  return given >= collectedVnd(invoice, payments) ? 'refunded' : 'refunded_partial';
}

/** `HĐ-0187`. */
export const invoiceNumber = (n: number) => `HĐ-${String(n).padStart(4, '0')}`;

/** The number after the highest one given so far. */
export function nextInvoiceNumber(invoices: readonly Invoice[]): string {
  const highest = invoices.reduce((m, i) => Math.max(m, Number(i.number.replace(/\D/g, ''))), 0);
  return invoiceNumber(highest + 1);
}

// --- Drafts ----------------------------------------------------------------------------------

/** Name of a line: the service, and the variant when the service has more than one. */
export const lineTitle = (service: Service, variant: ServiceVariant) =>
  service.variants.length === 1 ? service.name : `${service.name} · ${variant.name}`;

/** `PG-7K2Q9`: the reference of a deposit that came through the gateway, from the booking when it has none. */
export function depositRef(appt: Appointment): string {
  if (appt.depositRef) return appt.depositRef;
  let hash = 7;
  for (const ch of appt.id) hash = (hash * 31 + ch.charCodeAt(0)) % 60_466_176;
  return `PG-${hash.toString(36).toUpperCase().padStart(5, '0')}`;
}

/**
 * The invoice an appointment gets when it is done (BR-12: each service at the price of booking
 * time), with the payment its deposit made.
 */
export function draftInvoice(
  appt: Appointment,
  services: readonly Service[],
  number: string,
  now: string,
): { invoice: Invoice; payments: Payment[] } {
  const id = `inv-${number.replace(/\D/g, '')}`;
  const lines: InvoiceLine[] = appt.items.map((item, i) => {
    const service = services.find((s) => s.variants.some((v) => v.id === item.serviceVariantId));
    const variant = service?.variants.find((v) => v.id === item.serviceVariantId);
    return {
      id: `${id}-l${i}`,
      kind: 'service',
      description: service && variant ? lineTitle(service, variant) : 'Dịch vụ',
      detail: `Lịch ${formatTime(appt.startAt)}${item.staffChoice === 'any' ? ' · khách để "Bất kỳ ai"' : ''}`,
      quantity: 1,
      unitPriceVnd: item.priceVnd,
      staffResourceId: item.staffResourceId,
      serviceVariantId: item.serviceVariantId,
    };
  });
  const deposit = appt.depositVnd ?? 0n;
  const payments: Payment[] =
    deposit > 0n
      ? [
          {
            id: `pay-${id}-dep`,
            invoiceId: id,
            purpose: 'deposit',
            method: 'gateway',
            amountVnd: deposit,
            code: depositRef(appt),
            at:
              appt.depositPaidAt ??
              new Date(Date.parse(appt.startAt) - 2 * 86_400_000).toISOString(),
            status: 'paid',
            idempotencyKey: `deposit:${appt.id}`,
          },
        ]
      : [];
  return {
    invoice: {
      id,
      number,
      appointmentId: appt.id,
      customerId: appt.customerId,
      ...(appt.customerId ? {} : { customerName: 'Khách lẻ' }),
      createdAt: now,
      lines,
      depositVnd: deposit,
    },
    payments,
  };
}

/** The fee taken off a package that is given back (BR-27), until the settings page sets it. */
export const PACKAGE_CANCEL_FEE = 50_000n;
