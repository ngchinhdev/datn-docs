/*
 * Money of Spa thú cưng Pawpaw: what was collected since 01/10, one collected invoice of today and
 * the drafts of the pets being served.
 */
import { earnEntries } from '../commission.ts';
import { draftInvoice, invoiceNumber } from '../money.ts';
import { MOCK_NOW } from '../time.ts';
import { buildHistory, planSales } from './sales-history.ts';
import type {
  Appointment,
  CommissionEntry,
  CommissionRule,
  Invoice,
  MoneyState,
  Payment,
  Service,
  Staff,
} from './types.ts';

/** BR-41: every service 10%, retail 5%, and a higher rate for the senior groomer's grooming from 01/12. */
export const pawpawCommissionRules: CommissionRule[] = [
  { id: 'paw-rule-1', scope: 'all', percent: 10, effectiveFrom: '2026-10-01' },
  { id: 'paw-rule-2', scope: 'retail', percent: 5, effectiveFrom: '2026-10-01' },
  {
    id: 'paw-rule-3',
    scope: 'service',
    serviceId: 'paw-groom',
    level: 2,
    percent: 12,
    effectiveFrom: '2026-12-01',
  },
];

export function pawpawMoney(
  services: Service[],
  appointments: Appointment[],
  staff: Staff[],
): MoneyState {
  const rules = pawpawCommissionRules;
  const invoices: Invoice[] = [];
  const payments: Payment[] = [];

  // The sales since 01/10 take HĐ-0001 on; the invoices of today follow them.
  const sales = planSales(
    appointments,
    { fromDate: '2026-10-01', before: MOCK_NOW },
    new Set(['paw-a-group', 'paw-a-mochi', 'paw-a-milo']),
  );
  const history = buildHistory(
    sales,
    sales.map((_, i) => i + 1),
    { services, staff, rules, collectors: ['Linh', 'Khoa'] },
  );
  invoices.push(...history.invoices);
  payments.push(...history.payments);
  const commission: CommissionEntry[] = [...history.commission];
  const next = sales.length + 1;

  // The two pets of chị Quỳnh, done and paid at the desk this morning.
  const group = appointments.find((a) => a.id === 'paw-a-group');
  if (group) {
    const { invoice } = draftInvoice(group, services, invoiceNumber(next), '2026-11-07T02:00:00Z');
    const amountVnd = invoice.lines.reduce((m, l) => m + BigInt(l.quantity) * l.unitPriceVnd, 0n);
    const paid: Invoice = { ...invoice, paidAt: '2026-11-07T02:05:00Z', collectedBy: 'Linh' };
    invoices.push(paid);
    commission.push(
      ...earnEntries({
        invoice: paid,
        lines: paid.lines,
        discountVnd: 0n,
        rules,
        services,
        levelOf: (id) => staff.find((s) => s.resourceId === id)?.level,
        at: '2026-11-07T02:05:00Z',
      }),
    );
    payments.push({
      id: `pay-${invoiceNumber(next).slice(3)}`,
      invoiceId: invoice.id,
      purpose: 'invoice',
      method: 'cash',
      amountVnd,
      tenderedVnd: amountVnd,
      code: `CS-${invoiceNumber(next).slice(3)}`,
      at: '2026-11-07T02:05:00Z',
      status: 'paid',
      idempotencyKey: `seed:${invoice.id}`,
    });
  }

  ['paw-a-mochi', 'paw-a-milo'].forEach((id, i) => {
    const appt = appointments.find((a) => a.id === id);
    if (!appt) throw new Error(`Unknown appointment ${id}`);
    const draft = draftInvoice(appt, services, invoiceNumber(next + 1 + i), MOCK_NOW);
    invoices.push(draft.invoice);
    payments.push(...draft.payments);
  });

  return {
    commissionRules: rules,
    invoices,
    payments,
    walletEntries: history.walletEntries,
    refunds: [],
    commission,
    periods: [
      { id: '2026-11', label: '11/2026', status: 'open' },
      { id: '2026-10', label: '10/2026', status: 'open' },
      {
        id: '2026-09',
        label: '09/2026',
        status: 'closed',
        closedAt: '2026-10-05T02:12:00.000Z',
        closedBy: 'Chủ cơ sở',
      },
    ],
    audit: [],
  };
}
