/*
 * Money of Spa thú cưng Pawpaw: one collected invoice and the drafts of the pets being served.
 */
import { draftInvoice } from '../money.ts';
import { MOCK_NOW } from '../time.ts';
import type { Appointment, Invoice, MoneyState, Payment, Service } from './types.ts';

export function pawpawMoney(services: Service[], appointments: Appointment[]): MoneyState {
  const invoices: Invoice[] = [];
  const payments: Payment[] = [];

  // The two pets of chị Quỳnh, done and paid at the desk this morning.
  const group = appointments.find((a) => a.id === 'paw-a-group');
  if (group) {
    const { invoice } = draftInvoice(group, services, 'HĐ-0040', '2026-11-07T02:00:00Z');
    const amountVnd = invoice.lines.reduce((m, l) => m + BigInt(l.quantity) * l.unitPriceVnd, 0n);
    invoices.push({ ...invoice, paidAt: '2026-11-07T02:05:00Z', collectedBy: 'Vy' });
    payments.push({
      id: 'pay-0040',
      invoiceId: invoice.id,
      purpose: 'invoice',
      method: 'cash',
      amountVnd,
      tenderedVnd: amountVnd,
      code: 'CS-0040',
      at: '2026-11-07T02:05:00Z',
      status: 'paid',
      idempotencyKey: `seed:${invoice.id}`,
    });
  }

  ['paw-a-mochi', 'paw-a-milo'].forEach((id, i) => {
    const appt = appointments.find((a) => a.id === id);
    if (!appt) throw new Error(`Unknown appointment ${id}`);
    const draft = draftInvoice(appt, services, `HĐ-${String(41 + i).padStart(4, '0')}`, MOCK_NOW);
    invoices.push(draft.invoice);
    payments.push(...draft.payments);
  });

  return {
    invoices,
    payments,
    walletEntries: [],
    refunds: [],
    commission: [],
    periods: [
      { id: '2026-10', label: '10/2026', status: 'closed' },
      { id: '2026-11', label: '11/2026', status: 'open' },
    ],
    audit: [],
  };
}
