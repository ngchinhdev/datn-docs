/*
 * Money of Salon Tóc Mây as design/screens/HoaDonDanhSach.dc.html, HoanTien.dc.html and
 * HoSoKhach.dc.html draw it: invoices of 06/11 and 07/11, the wallet of chị Hà, four refund
 * requests. The drafts of today's appointments wait to be collected.
 */
import { draftInvoice } from '../money.ts';
import { MOCK_NOW } from '../time.ts';
import type {
  Appointment,
  CommissionEntry,
  Invoice,
  InvoiceLine,
  MoneyState,
  Payment,
  PaymentMethod,
  RefundRequest,
  Service,
  WalletEntry,
} from './types.ts';

/** Local `YYYY-MM-DD` and `HH:mm` as a UTC instant. */
const at = (date: string, hhmm: string) => new Date(`${date}T${hhmm}:00+07:00`).toISOString();

export function salonMoney(services: Service[], appointments: Appointment[]): MoneyState {
  const priceOf = (variantId: string) => {
    for (const s of services) {
      const v = s.variants.find((x) => x.id === variantId);
      if (v) return v.priceVnd;
    }
    throw new Error(`Unknown service variant ${variantId}`);
  };

  const invoices: Invoice[] = [];
  const payments: Payment[] = [];
  const commission: CommissionEntry[] = [];

  /** A collected invoice with one payment; `lines` are the service lines of the sample. */
  function paidInvoice(input: {
    no: string;
    customerId: string;
    when: string;
    lines: Omit<InvoiceLine, 'id'>[];
    method: PaymentMethod;
    appointmentId?: string;
    period: string;
    earn?: { staffResourceId: string; amountVnd: bigint };
  }) {
    const id = `inv-${input.no}`;
    const lines = input.lines.map((l, i) => ({ ...l, id: `${id}-l${i}` }));
    const amountVnd = lines.reduce((m, l) => m + BigInt(l.quantity) * l.unitPriceVnd, 0n);
    const prefix: Record<PaymentMethod, string> = {
      cash: 'CS',
      transfer: 'TF',
      card: 'CD',
      wallet: 'WL',
      gateway: 'PG',
    };
    invoices.push({
      id,
      number: `HĐ-${input.no}`,
      ...(input.appointmentId ? { appointmentId: input.appointmentId } : {}),
      customerId: input.customerId,
      createdAt: input.when,
      lines,
      depositVnd: 0n,
      paidAt: input.when,
      collectedBy: 'Lan',
    });
    payments.push({
      id: `pay-${input.no}`,
      invoiceId: id,
      purpose: 'invoice',
      method: input.method,
      amountVnd,
      ...(input.method === 'cash' ? { tenderedVnd: amountVnd } : {}),
      code: `${prefix[input.method]}-${input.no}`,
      at: input.when,
      status: 'paid',
      idempotencyKey: `seed:${id}`,
    });
    if (input.earn) {
      commission.push({
        id: `com-${input.no}`,
        ...input.earn,
        periodId: input.period,
        invoiceId: id,
        kind: 'earn',
        at: input.when,
      });
    }
    return id;
  }

  const wash = priceOf('may-wash-std');
  const cut = priceOf('may-cut-short');

  // Bought in October, so its commission period is already closed (BR-42).
  paidInvoice({
    no: '0182',
    customerId: 'may-c-phuc',
    when: at('2026-10-30', '15:05'),
    lines: [
      {
        kind: 'package_sale',
        description: 'Gói 10 lần gội sấy',
        detail: 'Hạn đến 28/04/2027',
        quantity: 1,
        unitPriceVnd: 700_000n,
        productId: 'may-pkg-10',
      },
    ],
    method: 'transfer',
    period: '2026-10',
  });
  paidInvoice({
    no: '0183',
    customerId: 'may-c-khanh',
    when: at('2026-11-06', '17:30'),
    lines: [
      {
        kind: 'service',
        description: 'Cắt tóc · Tóc ngắn',
        quantity: 1,
        unitPriceVnd: cut,
        staffResourceId: 'may-lan',
        serviceVariantId: 'may-cut-short',
      },
    ],
    method: 'card',
    period: '2026-11',
    earn: { staffResourceId: 'may-lan', amountVnd: cut / 10n },
  });
  paidInvoice({
    no: '0184',
    customerId: 'may-c-dieu',
    when: at('2026-11-06', '19:12'),
    lines: [
      {
        kind: 'service',
        description: 'Gội sấy',
        quantity: 1,
        unitPriceVnd: wash,
        staffResourceId: 'may-lan',
        serviceVariantId: 'may-wash-std',
      },
    ],
    method: 'cash',
    period: '2026-11',
    earn: { staffResourceId: 'may-lan', amountVnd: wash / 10n },
  });
  paidInvoice({
    no: '0185',
    customerId: 'may-c-quyen',
    when: at('2026-11-07', '08:40'),
    lines: [
      {
        kind: 'wallet_topup',
        description: 'Nạp ví',
        detail: 'Tặng 100.000 ₫',
        quantity: 1,
        unitPriceVnd: 1_000_000n,
        bonusVnd: 100_000n,
      },
    ],
    method: 'transfer',
    period: '2026-11',
  });
  paidInvoice({
    no: '0186',
    customerId: 'may-c-vy',
    appointmentId: 'may-a-vy',
    when: at('2026-11-07', '10:05'),
    lines: [
      {
        kind: 'service',
        description: 'Gội sấy',
        detail: 'Lịch 08:30',
        quantity: 1,
        unitPriceVnd: wash,
        staffResourceId: 'may-lan',
        serviceVariantId: 'may-wash-std',
      },
    ],
    method: 'cash',
    period: '2026-11',
    earn: { staffResourceId: 'may-lan', amountVnd: wash / 10n },
  });

  // Today's appointments that are done and not yet collected: Hà, Bảo An, Tuấn.
  ['may-a-ha', 'may-a-an', 'may-a-tuan'].forEach((id, i) => {
    const appt = appointments.find((a) => a.id === id);
    if (!appt) throw new Error(`Unknown appointment ${id}`);
    const draft = draftInvoice(appt, services, `HĐ-${String(187 + i).padStart(4, '0')}`, MOCK_NOW);
    invoices.push(draft.invoice);
    payments.push(...draft.payments);
  });

  const entry = (
    id: string,
    customerId: string,
    when: string,
    realVnd: bigint,
    bonusVnd: bigint,
    kind: WalletEntry['kind'],
    memo: string,
    invoiceId?: string,
  ): WalletEntry => ({
    id: `wl-${id}`,
    customerId,
    at: when,
    realVnd,
    bonusVnd,
    kind,
    memo,
    ...(invoiceId ? { invoiceId } : {}),
    idempotencyKey: `seed:wl-${id}`,
  });

  // Chị Hà: 1.000.000 ₫ and 100.000 ₫ bonus in, 850.000 ₫ spent; the rest is 150.000 ₫ real and 100.000 ₫ bonus.
  const walletEntries: WalletEntry[] = [
    entry(
      'ha-1',
      'may-c-ha',
      at('2026-10-01', '10:00'),
      1_000_000n,
      100_000n,
      'topup',
      'Nạp ví HĐ-0098, tặng 10%',
    ),
    entry('ha-2', 'may-c-ha', at('2026-10-12', '16:00'), -850_000n, 0n, 'payment', 'Trả HĐ-0121'),
    entry(
      'quyen-1',
      'may-c-quyen',
      at('2026-10-01', '09:30'),
      300_000n,
      0n,
      'topup',
      'Nạp ví ở quầy',
    ),
    entry(
      'quyen-2',
      'may-c-quyen',
      at('2026-10-15', '14:00'),
      -150_000n,
      0n,
      'payment',
      'Cắt tóc, trả bằng ví',
    ),
    entry(
      'quyen-3',
      'may-c-quyen',
      at('2026-11-07', '08:40'),
      1_000_000n,
      100_000n,
      'topup',
      'Nạp ví HĐ-0185, tặng 10%',
      'inv-0185',
    ),
  ];

  const request = (r: Omit<RefundRequest, 'customerId'> & { customerId: string | null }) => r;
  const refunds: RefundRequest[] = [
    request({
      id: 'rf-0184',
      invoiceId: 'inv-0184',
      paymentId: 'pay-0184',
      customerId: 'may-c-dieu',
      who: 'Chị Diệu',
      what: 'HĐ-0184 · Gội sấy',
      amountVnd: wash,
      method: 'cash',
      reason: 'Khách không hài lòng, sấy chưa khô',
      createdBy: 'Lan',
      createdAt: at('2026-11-06', '19:40'),
      status: 'pending',
      lineId: 'inv-0184-l0',
    }),
    request({
      id: 'rf-0183',
      invoiceId: 'inv-0183',
      paymentId: 'pay-0183',
      customerId: 'may-c-khanh',
      who: 'Anh Khánh',
      what: 'HĐ-0183 · Cắt tóc',
      amountVnd: 50_000n,
      method: 'card',
      reason: 'Tính nhầm giá tóc dài',
      createdBy: 'Lan',
      createdAt: at('2026-11-06', '17:45'),
      status: 'approved',
      decidedBy: 'Hùng',
      decidedAt: at('2026-11-06', '18:05'),
      lineId: 'inv-0183-l0',
    }),
    request({
      id: 'rf-auto-1',
      invoiceId: null,
      paymentId: null,
      customerId: null,
      who: 'Khách đặt online',
      what: 'Cọc lịch 14:00 · tiền về muộn',
      amountVnd: 100_000n,
      method: 'transfer',
      reason: 'Giờ đã có người đặt (BR-29)',
      createdBy: 'Tự động',
      createdAt: at('2026-11-06', '14:11'),
      status: 'auto',
    }),
    request({
      id: 'rf-0182',
      invoiceId: 'inv-0182',
      paymentId: 'pay-0182',
      customerId: 'may-c-phuc',
      who: 'Anh Phúc',
      what: 'HĐ-0182 · Gói 10 lần gội sấy, dùng 3',
      amountVnd: 410_000n,
      method: 'transfer',
      reason: 'Chuyển nhà, xin hoàn gói: 700.000 − 3 × 80.000 − phí 50.000 (BR-27)',
      createdBy: 'Lan',
      createdAt: at('2026-11-04', '11:02'),
      status: 'rejected',
      decidedBy: 'Hùng',
      decidedAt: at('2026-11-04', '15:30'),
      rejectNote: 'Gói còn hạn, mời khách dùng tiếp 7 buổi.',
      packageId: 'may-pkg-phuc-1',
      feeVnd: 50_000n,
    }),
  ];

  // Khánh's approved refund takes back its share of Lan's commission, in the period it was approved.
  commission.push({
    id: 'com-0183-back',
    staffResourceId: 'may-lan',
    periodId: '2026-11',
    amountVnd: -5_000n,
    invoiceId: 'inv-0183',
    kind: 'clawback',
    at: at('2026-11-06', '18:05'),
  });

  return {
    invoices,
    payments,
    walletEntries,
    refunds,
    commission,
    periods: [
      { id: '2026-10', label: '10/2026', status: 'closed' },
      { id: '2026-11', label: '11/2026', status: 'open' },
    ],
    audit: [
      {
        id: 'au-1',
        at: at('2026-11-06', '18:05'),
        by: 'Hùng',
        text: 'Duyệt hoàn 50.000 ₫ cho HĐ-0183',
      },
    ],
  };
}
