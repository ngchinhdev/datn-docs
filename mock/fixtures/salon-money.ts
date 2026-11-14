/*
 * Money of Salon Tóc Mây as design/screens/HoaDonDanhSach.dc.html, HoanTien.dc.html and
 * HoSoKhach.dc.html draw it: invoices of 06/11 and 07/11, the wallet of chị Hà, four refund
 * requests. The drafts of today's appointments wait to be collected.
 */
import { addAudit, SYSTEM_ACTOR, type Actor, type AuditInput } from '../audit.ts';
import { clawbackEntries, earnEntries } from '../commission.ts';
import { draftInvoice } from '../money.ts';
import { MOCK_NOW } from '../time.ts';
import { buildHistory, planSales } from './sales-history.ts';
import type {
  Appointment,
  AuditEntry,
  Customer,
  CommissionEntry,
  CommissionRule,
  Invoice,
  InvoiceLine,
  MoneyState,
  Payment,
  PaymentMethod,
  RefundRequest,
  Service,
  Staff,
  WalletEntry,
} from './types.ts';

/** Local `YYYY-MM-DD` and `HH:mm` as a UTC instant. */
const at = (date: string, hhmm: string) => new Date(`${date}T${hhmm}:00+07:00`).toISOString();

/** BR-41: every service 10%, retail 5%, and a higher rate for the senior dyer from 01/12. */
export const salonCommissionRules: CommissionRule[] = [
  { id: 'may-rule-1', scope: 'all', percent: 10, effectiveFrom: '2026-10-01' },
  { id: 'may-rule-2', scope: 'retail', percent: 5, effectiveFrom: '2026-10-01' },
  {
    id: 'may-rule-3',
    scope: 'service',
    serviceId: 'may-dye',
    level: 2,
    percent: 12,
    effectiveFrom: '2026-12-01',
  },
];

const METHOD_WORD: Record<PaymentMethod, string> = {
  cash: 'tiền mặt',
  transfer: 'chuyển khoản',
  card: 'thẻ',
  wallet: 'ví',
  gateway: 'cổng thanh toán',
};

/** What the log of 04/11 to 06/11 holds: the refunds above and the two things the system did. */
function sampleAudit(octRefund: { number: string; id: string; detail: string }): AuditEntry[] {
  const lan: Actor = { name: 'Lan', role: 'Lễ tân' };
  const hung: Actor = { name: 'Hùng', role: 'Quản lý' };
  let log: AuditEntry[] = [];
  const add = (when: string, actor: Actor, input: AuditInput) => {
    log = addAudit(log, when, actor, input);
  };
  add(at('2026-11-04', '11:02'), lan, {
    action: 'Tạo yêu cầu hoàn',
    object: 'HĐ-0182',
    href: 'invoices/inv-0182',
    detail: '410.000 ₫ chuyển khoản · Chuyển nhà, xin hoàn gói (BR-27)',
  });
  add(at('2026-11-04', '15:30'), hung, {
    action: 'Từ chối hoàn tiền',
    object: 'HĐ-0182',
    href: 'invoices/inv-0182',
    detail: '410.000 ₫ · Gói còn hạn, mời khách dùng tiếp 7 buổi.',
  });
  add(at('2026-11-05', '08:00'), SYSTEM_ACTOR, {
    action: 'Bật bắt buộc cọc',
    object: 'Bùi Hữu Phúc',
    href: 'customers/may-c-phuc',
    detail: 'Không đến lần thứ 2 (BR-10)',
  });
  add(at('2026-11-05', '09:10'), lan, {
    action: 'Tạo yêu cầu hoàn',
    object: octRefund.number,
    href: `invoices/${octRefund.id}`,
    detail: octRefund.detail,
  });
  add(at('2026-11-05', '09:40'), hung, {
    action: 'Duyệt hoàn tiền',
    object: octRefund.number,
    href: `invoices/${octRefund.id}`,
    detail: octRefund.detail,
  });
  add(at('2026-11-06', '14:11'), SYSTEM_ACTOR, {
    action: 'Hoàn cọc tự động',
    object: 'Lịch 14:00',
    href: 'refunds',
    detail: '100.000 ₫ · giờ đã có người đặt (BR-29)',
  });
  add(at('2026-11-06', '17:45'), lan, {
    action: 'Tạo yêu cầu hoàn',
    object: 'HĐ-0183',
    href: 'invoices/inv-0183',
    detail: '50.000 ₫ thẻ · Tính nhầm giá tóc dài',
  });
  add(at('2026-11-06', '18:05'), hung, {
    action: 'Duyệt hoàn tiền',
    object: 'HĐ-0183',
    href: 'invoices/inv-0183',
    detail: '50.000 ₫ về thẻ · Tính nhầm giá tóc dài',
  });
  add(at('2026-11-06', '19:40'), lan, {
    action: 'Tạo yêu cầu hoàn',
    object: 'HĐ-0184',
    href: 'invoices/inv-0184',
    detail: '80.000 ₫ tiền mặt · Khách không hài lòng, sấy chưa khô',
  });
  return log;
}

export function salonMoney(
  services: Service[],
  appointments: Appointment[],
  staff: Staff[],
  customers: Customer[],
): MoneyState {
  const rules = salonCommissionRules;
  const levelOf = (id: string) => staff.find((s) => s.resourceId === id)?.level;
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
    commission.push(
      ...earnEntries({
        invoice: invoices[invoices.length - 1]!,
        lines,
        discountVnd: 0n,
        rules,
        services,
        levelOf,
        at: input.when,
      }),
    );
    return id;
  }

  const wash = priceOf('may-wash-std');
  const cut = priceOf('may-cut-short');

  // Bought at the end of October; its price becomes revenue as the sessions are used (BR-26).
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
  });

  // Today's appointments that are done and not yet collected: Hà, Bảo An, Tuấn.
  ['may-a-ha', 'may-a-an', 'may-a-tuan'].forEach((id, i) => {
    const appt = appointments.find((a) => a.id === id);
    if (!appt) throw new Error(`Unknown appointment ${id}`);
    const draft = draftInvoice(appt, services, `HĐ-${String(187 + i).padStart(4, '0')}`, MOCK_NOW);
    invoices.push(draft.invoice);
    payments.push(...draft.payments);
  });

  // Anh Phúc's three sessions of the package (BR-26): the sale is worth 700.000 ₫, each session 70.000 ₫.
  const sessionDays: [string, string, string][] = [
    ['2026-11-02', '14:20', 'may-mai'],
    ['2026-11-04', '10:40', 'may-lan'],
    ['2026-11-05', '16:05', 'may-mai'],
  ];

  const invoicedAlready = new Set(
    ['may-a-vy', 'may-a-ha', 'may-a-an', 'may-a-tuan'].filter((id) =>
      appointments.some((a) => a.id === id),
    ),
  );
  const cutoff = at('2026-10-30', '15:05');
  const sales = planSales(
    appointments,
    { fromDate: '2026-10-01', before: MOCK_NOW },
    invoicedAlready,
  );
  const early = sales.filter((s) => s.paidAt < cutoff);
  const late = sales.filter((s) => s.paidAt >= cutoff);
  // The sample invoices start at HĐ-0182: older sales count back from HĐ-0181, newer ones go on from HĐ-0190.
  const history = buildHistory(
    [...early, ...late],
    [...early.map((_, i) => 181 - early.length + 1 + i), ...late.map((_, i) => 190 + i)],
    { services, staff, rules, collectors: ['Lan', 'Hùng'] },
  );
  invoices.push(...history.invoices);
  payments.push(...history.payments);
  commission.push(...history.commission);
  sessionDays.forEach(([date, time, staffId], i) => {
    const no = String(190 + late.length + i).padStart(4, '0');
    const when = at(date, time);
    const line: InvoiceLine = {
      id: `inv-${no}-l0`,
      kind: 'service',
      description: 'Gội sấy',
      detail: `Buổi ${i + 1} của Gói 10 lần gội sấy`,
      quantity: 1,
      unitPriceVnd: wash,
      staffResourceId: staffId,
      serviceVariantId: 'may-wash-std',
      packageId: 'may-pkg-phuc-1',
      sessionRevenueVnd: 70_000n,
      sessionNo: i + 1,
    };
    const invoice: Invoice = {
      id: `inv-${no}`,
      number: `HĐ-${no}`,
      customerId: 'may-c-phuc',
      createdAt: when,
      lines: [line],
      depositVnd: 0n,
      paidAt: when,
      collectedBy: 'Lan',
    };
    invoices.push(invoice);
    commission.push(
      ...earnEntries({
        invoice,
        lines: [line],
        discountVnd: 0n,
        rules,
        services,
        levelOf,
        at: when,
      }),
    );
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
    ...history.walletEntries,
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

  // An invoice of October that Hùng approved a partial refund for on 05/11: its commission goes back
  // in November and October stays as it was (BR-42).
  const octInvoice = history.invoices.find(
    (i) =>
      i.paidAt!.startsWith('2026-10') &&
      !i.discount &&
      i.depositVnd === 0n &&
      i.lines[0]?.staffResourceId === 'may-mai' &&
      i.lines[0].kind === 'service' &&
      i.lines[0].unitPriceVnd >= 150_000n,
  );
  if (!octInvoice) throw new Error('No October invoice of Mai to refund');
  const octPayment = history.payments.find(
    (p) => p.invoiceId === octInvoice.id && p.purpose === 'invoice',
  )!;
  const octCustomer = customers.find((c) => c.id === octInvoice.customerId);
  const octRefund: RefundRequest = {
    id: `rf-${octInvoice.number.slice(3)}-1`,
    invoiceId: octInvoice.id,
    paymentId: octPayment.id,
    customerId: octInvoice.customerId,
    who: octCustomer?.callName ?? 'Khách',
    what: `${octInvoice.number} · ${octInvoice.lines[0]!.description.split(' · ')[0]}`,
    amountVnd: 150_000n,
    method: octPayment.method,
    reason: 'Khách chưa hài lòng với màu, hoàn một phần',
    createdBy: 'Lan',
    createdAt: at('2026-11-05', '09:10'),
    status: 'approved',
    decidedBy: 'Hùng',
    decidedAt: at('2026-11-05', '09:40'),
    lineId: octInvoice.lines[0]!.id,
  };
  commission.push(
    ...clawbackEntries({
      refundId: octRefund.id,
      invoice: octInvoice,
      earned: commission.filter((c) => c.invoiceId === octInvoice.id),
      refundVnd: octRefund.amountVnd,
      lineId: octRefund.lineId!,
      discountVnd: 0n,
      at: octRefund.decidedAt!,
      fallback: () => null,
    }),
  );

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
    octRefund,
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
  commission.push(
    ...clawbackEntries({
      refundId: 'rf-0183',
      invoice: invoices.find((i) => i.id === 'inv-0183')!,
      earned: commission.filter((c) => c.invoiceId === 'inv-0183'),
      refundVnd: 50_000n,
      lineId: 'inv-0183-l0',
      discountVnd: 0n,
      at: at('2026-11-06', '18:05'),
      fallback: () => null,
    }),
  );

  return {
    commissionRules: rules,
    invoices,
    payments,
    walletEntries,
    refunds,
    commission,
    periods: [
      { id: '2026-11', label: '11/2026', status: 'open' },
      { id: '2026-10', label: '10/2026', status: 'open' },
      {
        id: '2026-09',
        label: '09/2026',
        status: 'closed',
        closedAt: at('2026-10-05', '09:12'),
        closedBy: 'Chính Nguyễn',
      },
    ],
    audit: sampleAudit({
      number: octInvoice.number,
      id: octInvoice.id,
      detail: `150.000 ₫ ${METHOD_WORD[octPayment.method]} · ${octRefund.reason}`,
    }),
  };
}
