/*
 * What the commission screens list (MH-37, MH-56): the lines of one person in one period, with the
 * words and numbers of each, and the CSV of them. Pure, so Node can run it
 * (scripts/check-reports.ts).
 */
import { periodLabelOf, periodRange } from './commission.ts';
import type { CommissionEntry, Invoice, MoneyState } from './fixtures/types.ts';
import { formatVnd } from './format.ts';
import { localDate } from './time.ts';

export interface PeriodLine {
  id: string;
  /** Local date of the posting. */
  date: string;
  invoiceId: string;
  invoiceNumber: string;
  /** What the line was: `Nhuộm tóc · Tóc ngắn`, `Gội sấy · buổi 4 của gói`, `Thu hồi: …`. */
  text: string;
  clawback: boolean;
  /** Retail lines are kept apart in the four figures. */
  source: CommissionEntry['source'];
  baseVnd: bigint;
  percent: number;
  amountVnd: bigint;
}

const discountText = (invoice: Invoice) => {
  const d = invoice.discount;
  if (!d) return '';
  return d.kind === 'percent' ? `, giảm ${d.percent}%` : `, giảm ${formatVnd(d.amountVnd)}`;
};

/** The words of one posting. A clawback says which period the invoice belonged to. */
export function entryText(money: MoneyState, entry: CommissionEntry): string {
  const invoice = money.invoices.find((i) => i.id === entry.invoiceId);
  const line = invoice?.lines.find((l) => l.id === entry.lineId);
  if (entry.kind === 'clawback') {
    const origin = money.commission.find(
      (c) => c.kind === 'earn' && c.invoiceId === entry.invoiceId,
    );
    const other = origin && origin.periodId !== entry.periodId;
    return `Thu hồi: hoàn tiền${other ? ` HĐ kỳ ${periodLabelOf(origin.periodId)}` : ''}${
      line ? ` · ${line.description.split(' · ')[0]}` : ''
    }`;
  }
  const name = line?.description ?? 'Dòng hóa đơn';
  if (entry.source === 'retail') return `${name} (bán lẻ)`;
  if (entry.sessionNo) return `${name.split(' · ')[0]} · buổi ${entry.sessionNo} của gói`;
  return `${name}${invoice ? discountText(invoice) : ''}`;
}

/** The lines of one person in one period, newest first. */
export function periodLines(
  money: MoneyState,
  periodId: string,
  staffResourceId: string,
): PeriodLine[] {
  return money.commission
    .filter((c) => c.periodId === periodId && c.staffResourceId === staffResourceId)
    .sort((a, b) => b.at.localeCompare(a.at) || b.id.localeCompare(a.id))
    .map((c) => ({
      id: c.id,
      date: localDate(c.at),
      invoiceId: c.invoiceId,
      invoiceNumber: money.invoices.find((i) => i.id === c.invoiceId)?.number ?? c.invoiceId,
      text: entryText(money, c),
      clawback: c.kind === 'clawback',
      source: c.source,
      baseVnd: c.baseVnd,
      percent: c.percent,
      amountVnd: c.amountVnd,
    }));
}

/** `01/11 – 30/11/2026`. */
export function periodSpan(periodId: string): string {
  const { from, to } = periodRange(periodId);
  return `${from.slice(8, 10)}/${from.slice(5, 7)} – ${to.slice(8, 10)}/${to.slice(5, 7)}/${to.slice(0, 4)}`;
}

const cell = (value: string | number | bigint) => {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

/** The lines as CSV, whole VND; a byte-order mark opens it in Excel. */
export function periodCsv(args: { periodLabel: string; staffName: string; lines: PeriodLine[] }) {
  const rows: (string | number | bigint)[][] = [
    ['Hoa hồng', `Kỳ ${args.periodLabel}`, args.staffName],
    [],
    ['Ngày', 'Hóa đơn', 'Dòng', 'Tính trên (₫)', 'Tỉ lệ (%)', 'Hoa hồng (₫)'],
    ...args.lines.map((l) => [
      `${l.date.slice(8, 10)}/${l.date.slice(5, 7)}/${l.date.slice(0, 4)}`,
      l.invoiceNumber,
      l.text,
      l.baseVnd,
      l.percent,
      l.amountVnd,
    ]),
  ];
  return `﻿${rows.map((r) => r.map(cell).join(',')).join('\r\n')}\r\n`;
}
