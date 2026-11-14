/*
 * What a shop collected before today: one paid invoice for every completed appointment, so the
 * reports and the commission periods have something to add up. Deterministic: the same
 * appointments give the same invoices on every run.
 */
import { earnEntries } from '../commission.ts';
import { draftInvoice, invoiceNumber, invoiceTotals } from '../money.ts';
import { addMinutes, localDate } from '../time.ts';
import type {
  Appointment,
  CommissionEntry,
  CommissionRule,
  Discount,
  Invoice,
  InvoiceLine,
  Payment,
  PaymentMethod,
  Service,
  Staff,
  WalletEntry,
} from './types.ts';

/** A completed appointment waiting for its invoice, with the moment it was paid. */
export interface Sale {
  appointment: Appointment;
  /** ISO 8601, UTC. */
  paidAt: string;
}

const PREFIX: Record<PaymentMethod, string> = {
  cash: 'CS',
  transfer: 'TF',
  card: 'CD',
  wallet: 'WL',
  gateway: 'PG',
};
const METHODS: PaymentMethod[] = ['cash', 'transfer', 'card', 'cash', 'transfer'];

/** The appointments to invoice, oldest first: completed, paid, between the two moments. */
export function planSales(
  appointments: readonly Appointment[],
  range: { fromDate: string; before: string },
  skip: ReadonlySet<string>,
): Sale[] {
  const sales: Sale[] = [];
  for (const appointment of appointments) {
    if (appointment.status !== 'completed' || !appointment.settled) continue;
    if (skip.has(appointment.id)) continue;
    const end = appointment.bookings.reduce(
      (m, b) => (b.endAt > m ? b.endAt : m),
      appointment.startAt,
    );
    const paidAt = addMinutes(end, 5);
    if (localDate(appointment.startAt) < range.fromDate) continue;
    if (paidAt >= range.before) continue;
    sales.push({ appointment, paidAt });
  }
  return sales.sort((a, b) => a.paidAt.localeCompare(b.paidAt));
}

export interface HistoryContext {
  services: readonly Service[];
  staff: readonly Staff[];
  rules: readonly CommissionRule[];
  /** Who collects at the desk, as the invoice writes it. */
  collectors: readonly string[];
}

export interface History {
  invoices: Invoice[];
  payments: Payment[];
  walletEntries: WalletEntry[];
  commission: CommissionEntry[];
}

const RETAIL: { name: string; priceVnd: bigint }[] = [
  { name: 'Dầu xả giữ màu', priceVnd: 120_000n },
  { name: 'Serum dưỡng tóc', priceVnd: 180_000n },
  { name: 'Dầu gội phục hồi', priceVnd: 150_000n },
];

/**
 * Builds the invoice of each sale with the number given at the same position. About one in nine
 * carries a retail line, sold by the first person of the invoice (one in twenty-three by nobody,
 * BR-40); one in fifteen a hand discount of 10% (BR-22). Payment methods take turns.
 */
export function buildHistory(
  sales: readonly Sale[],
  numbers: readonly number[],
  ctx: HistoryContext,
): History {
  const out: History = { invoices: [], payments: [], walletEntries: [], commission: [] };
  const levelOf = (id: string) => ctx.staff.find((s) => s.resourceId === id)?.level;

  sales.forEach((sale, i) => {
    const no = numbers[i]!;
    const draft = draftInvoice(sale.appointment, [...ctx.services], invoiceNumber(no), sale.paidAt);
    const lines: InvoiceLine[] = [...draft.invoice.lines];
    const first = lines[0]?.staffResourceId;
    if (i % 9 === 4 && first) {
      const item = RETAIL[i % RETAIL.length]!;
      lines.push({
        id: `${draft.invoice.id}-r0`,
        kind: 'retail',
        description: item.name,
        detail: 'Bán lẻ',
        quantity: 1,
        unitPriceVnd: item.priceVnd,
        staffResourceId: first,
      });
    } else if (i % 23 === 7) {
      const item = RETAIL[(i + 1) % RETAIL.length]!;
      lines.push({
        id: `${draft.invoice.id}-r0`,
        kind: 'retail',
        description: item.name,
        detail: 'Bán lẻ',
        quantity: 1,
        unitPriceVnd: item.priceVnd,
      });
    }
    const discount: Discount | undefined =
      i % 15 === 11
        ? { kind: 'percent', percent: 10, reason: 'Khách quen', approvedBy: 'Quản lý' }
        : undefined;
    const collectedBy = ctx.collectors[i % ctx.collectors.length] ?? 'Lễ tân';
    const invoice: Invoice = {
      ...draft.invoice,
      lines,
      ...(discount ? { discount } : {}),
      paidAt: sale.paidAt,
      collectedBy,
    };
    const totals = invoiceTotals(lines, discount, invoice.depositVnd);

    out.invoices.push(invoice);
    out.payments.push(...draft.payments);
    if (totals.due > 0n) {
      const method = METHODS[i % METHODS.length]!;
      out.payments.push({
        id: `pay-${invoiceNumber(no).slice(3)}`,
        invoiceId: invoice.id,
        purpose: 'invoice',
        method,
        amountVnd: totals.due,
        ...(method === 'cash' ? { tenderedVnd: totals.due } : {}),
        code: `${PREFIX[method]}-${invoiceNumber(no).slice(3)}`,
        at: sale.paidAt,
        status: 'paid',
        idempotencyKey: `seed:${invoice.id}`,
      });
    }
    if (totals.depositUnused > 0n && invoice.customerId) {
      out.walletEntries.push({
        id: `wl-${invoice.id}-deposit-excess`,
        customerId: invoice.customerId,
        at: sale.paidAt,
        realVnd: totals.depositUnused,
        bonusVnd: 0n,
        kind: 'deposit_excess',
        memo: `Cọc thừa ${invoice.number} chuyển vào ví`,
        invoiceId: invoice.id,
        idempotencyKey: `seed:deposit-excess:${invoice.id}`,
      });
    }
    out.commission.push(
      ...earnEntries({
        invoice,
        lines,
        discountVnd: totals.discount,
        rules: ctx.rules,
        services: [...ctx.services],
        levelOf,
        at: sale.paidAt,
      }),
    );
  });
  return out;
}
