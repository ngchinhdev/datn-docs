/*
 * View models for the invoice screens: the rows of the list and the history of one invoice. Pure.
 */
import type { Customer, Invoice, MoneyState, PaymentMethod } from './fixtures/types.ts';
import { formatVnd } from './format.ts';
import { collectedVnd, invoiceStatus, invoiceTotals, type InvoiceStatus } from './money.ts';
import { addDays, formatTime, localDate, MOCK_NOW } from './time.ts';

export interface InvoiceRow {
  id: string;
  number: string;
  /** ISO 8601, UTC: when it was collected, else when the draft was made. */
  at: string;
  customerId: string | null;
  customerName: string;
  /** What was sold, `Gội sấy (gói), Cắt tóc`. */
  summary: string;
  /** What was collected; the amount due while it is not. */
  amountVnd: bigint;
  methods: PaymentMethod[];
  status: InvoiceStatus;
  /** Awaiting a transfer: the amount the bank still owes. */
  pendingVnd: bigint;
}

const METHOD_ORDER: PaymentMethod[] = ['wallet', 'cash', 'transfer', 'card'];

/** `Gội sấy · Tiêu chuẩn` is `Gội sấy` in a list of what was sold. */
const shortName = (description: string) => description.split(' · ')[0] ?? description;

export function invoiceRows(money: MoneyState, customers: readonly Customer[]): InvoiceRow[] {
  return money.invoices
    .map((invoice): InvoiceRow => {
      const customer = customers.find((c) => c.id === invoice.customerId);
      const totals = invoiceTotals(invoice.lines, invoice.discount, invoice.depositVnd);
      const status = invoiceStatus(invoice, money.payments, money.refunds);
      const own = money.payments.filter(
        (p) => p.invoiceId === invoice.id && p.purpose === 'invoice',
      );
      const summary = invoice.lines
        .map((l) => {
          if (l.kind === 'wallet_topup') {
            return `Nạp ví ${formatVnd(l.unitPriceVnd)}${l.bonusVnd ? `, tặng ${formatVnd(l.bonusVnd)}` : ''}`;
          }
          return `${shortName(l.description)}${l.packageId ? ' (gói)' : ''}`;
        })
        .join(', ');
      return {
        id: invoice.id,
        number: invoice.number,
        at: invoice.paidAt ?? invoice.createdAt,
        customerId: invoice.customerId,
        customerName: customer?.name ?? invoice.customerName ?? 'Khách lẻ',
        summary,
        amountVnd: invoice.paidAt ? collectedVnd(invoice, money.payments) : totals.due,
        methods: METHOD_ORDER.filter((m) => own.some((p) => p.method === m)),
        status,
        pendingVnd: own
          .filter((p) => p.status === 'pending')
          .reduce((sum, p) => sum + p.amountVnd, 0n),
      };
    })
    .sort((a, b) => b.at.localeCompare(a.at) || b.number.localeCompare(a.number));
}

/** Today: `10:48`; yesterday: `Hôm qua 19:12`; before: `30/10 15:05`. */
export function formatInvoiceTime(iso: string): string {
  const date = localDate(iso);
  const today = localDate(MOCK_NOW);
  if (date === today) return formatTime(iso);
  if (date === addDays(today, -1)) return `Hôm qua ${formatTime(iso)}`;
  return `${date.slice(8, 10)}/${date.slice(5, 7)} ${formatTime(iso)}`;
}

/** `07/11/2026 10:48`. */
export function formatInvoiceStamp(iso: string): string {
  const date = localDate(iso);
  return `${date.slice(8, 10)}/${date.slice(5, 7)}/${date.slice(0, 4)} ${formatTime(iso)}`;
}

export interface HistoryLine {
  at: string;
  text: string;
}

/** What happened to an invoice, oldest first. */
export function invoiceHistory(
  invoice: Invoice,
  money: MoneyState,
  names: { staff: (id: string) => string },
): HistoryLine[] {
  const out: HistoryLine[] = [];
  if (invoice.appointmentId) {
    out.push({ at: invoice.createdAt, text: 'Lịch hoàn thành, hóa đơn nháp tự tạo' });
  } else {
    out.push({ at: invoice.createdAt, text: 'Hóa đơn nháp được tạo' });
  }
  const own = money.payments.filter((p) => p.invoiceId === invoice.id && p.purpose === 'invoice');
  const waiting = own.find((p) => p.status === 'pending');
  if (waiting) {
    out.push({
      at: waiting.at,
      text: `Chờ ngân hàng báo chuyển khoản ${formatVnd(waiting.amountVnd)} (${waiting.code})`,
    });
  }
  if (invoice.paidAt) {
    const totals = invoiceTotals(invoice.lines, invoice.discount, invoice.depositVnd);
    out.push({
      at: invoice.paidAt,
      text: `${invoice.collectedBy ?? 'Nhân viên'} thu ${formatVnd(totals.due)}`,
    });
    for (const l of invoice.lines.filter((x) => x.sessionRevenueVnd)) {
      out.push({
        at: invoice.paidAt,
        text: `Doanh thu buổi gói ${formatVnd(l.sessionRevenueVnd!)} ghi cho ${l.description} (BR-26)`,
      });
    }
    const excess = money.walletEntries.find(
      (e) => e.invoiceId === invoice.id && e.kind === 'deposit_excess',
    );
    if (excess) {
      out.push({
        at: invoice.paidAt,
        text: `Cọc thừa ${formatVnd(excess.realVnd)} chuyển vào ví của khách`,
      });
    }
    const period = money.commission.find((c) => c.invoiceId === invoice.id && c.kind === 'earn');
    const label = money.periods.find((p) => p.id === period?.periodId)?.label;
    const earners = new Set(
      money.commission
        .filter((x) => x.invoiceId === invoice.id && x.kind === 'earn')
        .map((x) => x.staffResourceId),
    );
    for (const id of earners) {
      out.push({
        at: invoice.paidAt,
        text: `Hoa hồng của ${names.staff(id)} ghi vào kỳ ${label ?? ''}`.trim(),
      });
    }
  }
  for (const r of money.refunds.filter((x) => x.invoiceId === invoice.id)) {
    out.push({
      at: r.createdAt,
      text: `${r.createdBy} yêu cầu hoàn ${formatVnd(r.amountVnd)}: ${r.reason}`,
    });
    if (r.decidedAt && r.status === 'approved') {
      out.push({ at: r.decidedAt, text: `${r.decidedBy} duyệt hoàn ${formatVnd(r.amountVnd)}` });
    }
    if (r.decidedAt && r.status === 'rejected') {
      out.push({ at: r.decidedAt, text: `${r.decidedBy} từ chối hoàn ${formatVnd(r.amountVnd)}` });
    }
  }
  return out.sort((a, b) => a.at.localeCompare(b.at));
}
