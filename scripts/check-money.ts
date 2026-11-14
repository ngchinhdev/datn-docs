/*
 * Checks the arithmetic of money (mock/money.ts) against the worked examples of
 * content/docs/nghiep-vu/quy-tac.md (BR-22, BR-25, BR-26, BR-27, BR-28, BR-40, BR-42), a sweep of
 * random amounts for the invariants, and the sample money data.
 * Run: pnpm check:money   (Node 24 runs TypeScript directly)
 */
import { tenantFixtures } from '../mock/fixtures/index.ts';
import type { Invoice, InvoiceLine, Payment, RefundRequest } from '../mock/fixtures/types.ts';
import {
  cancelTransfer,
  collect,
  confirmTransfer,
  editInvoice,
  ensureDraft,
  newDraft,
  requestRefund,
  usablePackage,
  type Ctx,
  type World,
} from '../mock/money-ops.ts';
import {
  addAutoRefund,
  approvalEffects,
  approveRefund,
  rejectRefund,
} from '../mock/money-refunds.ts';
import {
  collectedVnd,
  commissionClawback,
  commissionEarned,
  invoiceStatus,
  invoiceTotals,
  nextInvoiceNumber,
  packageRefund,
  parseVnd,
  refundable,
  sessionRevenue,
  settlementGap,
  splitWallet,
  splitWalletRefund,
  topupBonus,
  walletBalance,
} from '../mock/money.ts';

let failures = 0;
const report = (ok: boolean, name: string, detail = '') => {
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` :: ${detail}` : ''}`);
};
const show = (v: unknown) =>
  JSON.stringify(v, (_key, value) => (typeof value === 'bigint' ? `${value}n` : value));

const salon = tenantFixtures.find((f) => f.tenant.slug === 'toc-may')!;

// ---- BR-25: paying with the wallet takes real money first ----

{
  const got = splitWallet(200_000n, 150_000n, 100_000n);
  report(
    got.realVnd === 150_000n && got.bonusVnd === 50_000n && got.shortVnd === 0n,
    'BR-25: ví 150.000 ₫ thật + 100.000 ₫ tặng, trả 200.000 ₫ → 150.000 ₫ thật, 50.000 ₫ tặng',
    show(got),
  );
  const small = splitWallet(80_000n, 150_000n, 100_000n);
  report(
    small.realVnd === 80_000n && small.bonusVnd === 0n,
    'BR-25: trả 80.000 ₫ chỉ động tới tiền thật',
  );
  const short = splitWallet(300_000n, 150_000n, 100_000n);
  report(short.shortVnd === 50_000n, 'BR-25: ví không đủ thì báo thiếu', show(short));
  let threw = false;
  try {
    splitWallet(-1n, 0n, 0n);
  } catch {
    threw = true;
  }
  report(threw, 'BR-25: số tiền âm bị từ chối');
}

// ---- BR-25: the bonus of a top-up ----

{
  const tiers = salon.topupBonusTiers;
  report(topupBonus(1_000_000n, tiers) === 100_000n, 'BR-25: nạp 1.000.000 ₫ tặng 100.000 ₫');
  report(topupBonus(999_999n, tiers) === 0n, 'BR-25: nạp dưới 1.000.000 ₫ không tặng');
  report(topupBonus(2_000_000n, tiers) === 200_000n, 'BR-25: nạp 2.000.000 ₫ tặng 200.000 ₫');
  const layered = [
    { minVnd: 1_000_000n, percent: 10 },
    { minVnd: 3_000_000n, percent: 15 },
  ];
  report(topupBonus(3_000_000n, layered) === 450_000n, 'BR-25: bậc cao nhất đạt được thắng');
  report(
    topupBonus(1_000_001n, tiers) === 100_000n,
    'BR-25: phần lẻ làm tròn xuống, không ra số thập phân',
  );
}

// ---- BR-27, BR-26: package refund and revenue ----

{
  report(
    packageRefund(700_000n, 80_000n, 3, 50_000n) === 410_000n,
    'BR-27: 700.000 − 3 × 80.000 − 50.000 = 410.000 ₫',
  );
  report(packageRefund(380_000n, 80_000n, 5, 50_000n) === 0n, 'BR-27: âm thì bằng 0');
  report(
    packageRefund(700_000n, 80_000n, 0, 0n) === 700_000n,
    'BR-27: chưa dùng buổi nào, không phí → hoàn đủ',
  );
  report(
    sessionRevenue(700_000n, 10, 1) === 70_000n,
    'BR-26: gói 700.000 ₫ / 10 buổi = 70.000 ₫ mỗi buổi',
  );
  report(
    sessionRevenue(380_000n, 5, 1) === 76_000n,
    'BR-26: gói 380.000 ₫ / 5 buổi = 76.000 ₫ mỗi buổi',
  );
  let total = 0n;
  for (let n = 1; n <= 3; n++) total += sessionRevenue(1_000_000n, 3, n);
  report(
    total === 1_000_000n,
    'BR-26: ba buổi của gói 1.000.000 ₫ cộng lại đúng 1.000.000 ₫ (buổi cuối nhận phần dư)',
  );
}

// ---- BR-22: order of an invoice ----

const line = (over: Partial<InvoiceLine> & Pick<InvoiceLine, 'unitPriceVnd'>): InvoiceLine => ({
  id: 'l',
  kind: 'service',
  description: 'x',
  quantity: 1,
  ...over,
});

{
  // Chị Hà: Nhuộm tóc 500.000 + dầu xả 120.000, cọc 100.000 → 520.000 ₫.
  const t = invoiceTotals(
    [line({ unitPriceVnd: 500_000n }), line({ kind: 'retail', unitPriceVnd: 120_000n })],
    undefined,
    100_000n,
  );
  report(
    t.subtotal === 620_000n && t.due === 520_000n,
    'BR-22: 500.000 + 120.000, cọc 100.000 → còn phải thu 520.000 ₫',
    show(t),
  );

  // Anh Bảo An: Gội sấy dùng gói (80.000 → 0), Cắt tóc 150.000 → 150.000 ₫.
  const an = invoiceTotals(
    [line({ unitPriceVnd: 80_000n, packageId: 'p' }), line({ unitPriceVnd: 150_000n })],
    undefined,
    0n,
  );
  report(
    an.subtotal === 230_000n && an.packageUsed === 80_000n && an.due === 150_000n,
    'BR-22: dòng dùng buổi gói về 0 ₫ → tạm tính 230.000, dùng gói 80.000, còn 150.000 ₫',
    show(an),
  );

  // The discount is taken after the package sessions and before the deposit.
  const disc = invoiceTotals(
    [line({ unitPriceVnd: 80_000n, packageId: 'p' }), line({ unitPriceVnd: 150_000n })],
    { kind: 'percent', percent: 10, reason: 'Khách quen', approvedBy: 'Hùng' },
    50_000n,
  );
  report(
    disc.discount === 15_000n && disc.afterDiscount === 135_000n && disc.due === 85_000n,
    'BR-22: giảm 10% tính trên phần sau buổi gói (150.000 → 15.000), rồi mới trừ cọc 50.000 → 85.000 ₫',
    show(disc),
  );
  const flat = invoiceTotals(
    [line({ unitPriceVnd: 100_000n })],
    { kind: 'amount', amountVnd: 500_000n, reason: 'x', approvedBy: 'y' },
    0n,
  );
  report(
    flat.discount === 100_000n && flat.due === 0n,
    'BR-22: giảm theo số tiền không vượt quá hóa đơn',
  );
  const over = invoiceTotals([line({ unitPriceVnd: 100_000n })], undefined, 150_000n);
  report(
    over.depositApplied === 100_000n && over.depositUnused === 50_000n && over.due === 0n,
    'BR-22: cọc lớn hơn hóa đơn chỉ trừ đủ hóa đơn, phần dư ghi riêng',
    show(over),
  );
  report(
    parseVnd('1.000.000') === 1_000_000n && parseVnd('12a') === null && parseVnd('') === null,
    'parseVnd đọc số có dấu chấm, từ chối chữ',
  );
  report(
    settlementGap(520_000n, 520_000n).kind === 'ok' &&
      settlementGap(520_000n, 500_000n).gapVnd === 20_000n &&
      settlementGap(520_000n, 530_000n).kind === 'over',
    'BR-21: tổng các khoản phải đúng số còn phải thu',
  );
}

// ---- Sweep: invariants over many amounts ----

{
  let seed = 20261113;
  const next = (limit: number) => {
    seed = (seed * 1_103_515_245 + 12_345) % 2_147_483_648;
    return seed % limit;
  };
  let bad = '';
  for (let i = 0; i < 4000 && !bad; i++) {
    const real = BigInt(next(500) * 1000);
    const bonus = BigInt(next(300) * 1000);
    const amount = BigInt(next(900) * 1000);
    const s = splitWallet(amount, real, bonus);
    if (s.realVnd + s.bonusVnd + s.shortVnd !== amount) bad = `splitWallet cộng không ra ${amount}`;
    else if (s.realVnd > real || s.bonusVnd > bonus) bad = 'splitWallet lấy quá số dư';
    else if (s.bonusVnd > 0n && s.realVnd < real) {
      bad = 'splitWallet động tới tiền tặng khi còn tiền thật';
    }
    const lines = [
      line({ unitPriceVnd: BigInt(next(400) * 1000) }),
      line({ unitPriceVnd: BigInt(next(300) * 1000), packageId: 'p' }),
      line({ kind: 'retail', quantity: 1 + next(3), unitPriceVnd: BigInt(next(100) * 1000) }),
    ];
    const discount =
      next(2) === 0
        ? undefined
        : next(2) === 0
          ? ({ kind: 'percent', percent: next(101), reason: 'r', approvedBy: 'm' } as const)
          : ({
              kind: 'amount',
              amountVnd: BigInt(next(600) * 1000),
              reason: 'r',
              approvedBy: 'm',
            } as const);
    const deposit = BigInt(next(300) * 1000);
    const t = invoiceTotals(lines, discount, deposit);
    if (t.due < 0n || t.afterDiscount < 0n || t.discount < 0n) bad = `hóa đơn âm: ${show(t)}`;
    else if (t.subtotal - t.packageUsed - t.discount - t.depositApplied !== t.due) {
      bad = `hóa đơn không khớp: ${show(t)}`;
    } else if (t.depositApplied + t.depositUnused !== deposit) bad = 'cọc không khớp';
    const pct = next(40);
    const earned = commissionEarned(lines, t.discount, pct).reduce((m, e) => m + e.amountVnd, 0n);
    if (earned > (t.afterDiscount * BigInt(pct)) / 100n) {
      bad = 'hoa hồng vượt phần trăm của số thực thu';
    }
  }
  report(
    bad === '',
    'Quét 4.000 bộ số: ví không lấy quá số dư, hóa đơn không âm, các phần cộng lại đúng',
    bad,
  );
}

// ---- BR-28: refund of a payment ----

const wallet = (over: Partial<Payment>): Payment => ({
  id: 'p-w',
  invoiceId: 'inv',
  purpose: 'invoice',
  method: 'wallet',
  amountVnd: 200_000n,
  realVnd: 150_000n,
  bonusVnd: 50_000n,
  code: 'WL-1',
  at: '2026-11-07T03:48:00Z',
  status: 'paid',
  idempotencyKey: 'k',
  ...over,
});
const request = (over: Partial<RefundRequest>): RefundRequest => ({
  id: 'r',
  invoiceId: 'inv',
  paymentId: 'p-w',
  customerId: null,
  who: '',
  what: '',
  amountVnd: 0n,
  method: 'wallet',
  reason: 'x',
  createdBy: 'Lan',
  createdAt: '2026-11-07T04:00:00Z',
  status: 'pending',
  ...over,
});

{
  const split = splitWalletRefund(wallet({}), [], 200_000n);
  report(
    split.realVnd === 150_000n && split.bonusVnd === 50_000n,
    'BR-28: hoàn khoản ví 200.000 ₫ → ví +150.000 ₫ thật, +50.000 ₫ tặng',
    show(split),
  );
  const half = splitWalletRefund(wallet({}), [], 100_000n);
  report(
    half.realVnd === 75_000n && half.bonusVnd === 25_000n,
    'BR-28: hoàn một nửa giữ tỉ lệ 3 : 1',
    show(half),
  );
  const afterHalf = splitWalletRefund(
    wallet({}),
    [
      request({
        status: 'approved',
        amountVnd: 100_000n,
        walletRealVnd: 75_000n,
        walletBonusVnd: 25_000n,
      }),
    ],
    100_000n,
  );
  report(
    afterHalf.realVnd === 75_000n && afterHalf.bonusVnd === 25_000n,
    'BR-28: hoàn nốt phần còn lại, tổng đúng số đã trả',
  );

  const inv: Invoice = {
    id: 'inv',
    number: 'HĐ-0187',
    customerId: 'c',
    createdAt: '2026-11-07T03:48:00Z',
    lines: [line({ unitPriceVnd: 500_000n }), line({ kind: 'retail', unitPriceVnd: 120_000n })],
    depositVnd: 100_000n,
    paidAt: '2026-11-07T03:48:00Z',
  };
  const cash = wallet({
    id: 'p-c',
    method: 'cash',
    amountVnd: 320_000n,
    realVnd: 0n,
    bonusVnd: 0n,
    tenderedVnd: 500_000n,
  });
  const dep = wallet({
    id: 'p-d',
    purpose: 'deposit',
    method: 'gateway',
    amountVnd: 100_000n,
    realVnd: 0n,
    bonusVnd: 0n,
  });
  const none: RefundRequest[] = [];
  report(
    refundable(inv, cash, none).maxVnd === 320_000n,
    'BR-28: tiền mặt 320.000 ₫ hoàn tối đa 320.000 ₫',
  );
  const held = [request({ paymentId: 'p-c', amountVnd: 120_000n, status: 'pending' })];
  report(
    refundable(inv, cash, held).maxVnd === 200_000n,
    'BR-28: yêu cầu đang chờ giữ chỗ phần của nó → còn 200.000 ₫',
  );
  const refused = [request({ paymentId: 'p-c', amountVnd: 120_000n, status: 'rejected' })];
  report(
    refundable(inv, cash, refused).maxVnd === 320_000n,
    'BR-28: yêu cầu bị từ chối trả lại phần đã giữ',
  );
  const all = [request({ paymentId: 'p-c', amountVnd: 320_000n, status: 'approved' })];
  report(
    refundable(inv, cash, all).maxVnd === 0n,
    'BR-28: hoàn không vượt số đã thu',
    refundable(inv, cash, all).blocked ?? '',
  );
  const d = refundable(inv, dep, none);
  report(
    d.maxVnd === 0n && d.blocked !== null,
    'BR-28: cọc đã trừ vào dịch vụ thì tắt, ghi lý do',
    d.blocked ?? '',
  );
  const pending = wallet({ id: 'p-t', method: 'transfer', status: 'pending' });
  report(
    refundable(inv, pending, none).maxVnd === 0n,
    'BR-21: khoản chuyển khoản chưa về chưa hoàn được',
  );
}

// ---- BR-28, BR-42, BR-40: commission ----

{
  const lines = [
    line({ id: 'a', unitPriceVnd: 500_000n, staffResourceId: 'may-mai' }),
    line({ id: 'b', kind: 'retail', unitPriceVnd: 120_000n, staffResourceId: 'may-mai' }),
  ];
  const periods = salon.money.periods;
  const back = commissionClawback({
    refundVnd: 80_000n,
    percent: 10,
    lines,
    discountVnd: 0n,
    lineId: 'b',
    periods,
  });
  report(
    back.entries.length === 1 &&
      back.entries[0]!.amountVnd === -8_000n &&
      back.period.id === '2026-11',
    'BR-42: hoàn 80.000 ₫ thu hồi 8.000 ₫ vào kỳ 11/2026 đang mở',
    show(back),
  );
  const shared = commissionClawback({
    refundVnd: 100_000n,
    percent: 10,
    lines: [
      line({ id: 'a', unitPriceVnd: 300_000n, staffResourceId: 'may-mai' }),
      line({ id: 'b', unitPriceVnd: 100_000n, staffResourceId: 'may-lan' }),
    ],
    discountVnd: 0n,
    periods,
  });
  const by = Object.fromEntries(shared.entries.map((e) => [e.staffResourceId, e.amountVnd]));
  report(
    by['may-mai'] === -7_500n && by['may-lan'] === -2_500n,
    'BR-28: không chỉ định dòng thì thu hồi theo phần mỗi người đã được',
    show(by),
  );
  let threw = false;
  try {
    commissionClawback({
      refundVnd: 1n,
      percent: 10,
      lines,
      discountVnd: 0n,
      periods: [{ id: 'x', label: 'x', status: 'closed' }],
    });
  } catch {
    threw = true;
  }
  report(threw, 'BR-42: không có kỳ mở thì không ghi vào kỳ đã chốt');
  const earned = commissionEarned(
    [line({ unitPriceVnd: 500_000n, staffResourceId: 'may-mai' })],
    50_000n,
    10,
  );
  report(
    earned[0]?.amountVnd === 45_000n,
    'BR-40: hoa hồng tính trên số thực thu sau giảm giá (450.000 × 10%)',
    show(earned),
  );
}

// ---- The sample data of the two tenants ----

for (const f of tenantFixtures) {
  const m = f.money;
  const name = f.tenant.name;
  const numbers = m.invoices.map((i) => i.number);
  report(new Set(numbers).size === numbers.length, `${name}: số hóa đơn không trùng`);

  const badPay = m.invoices.filter((i) => {
    if (!i.paidAt) return false;
    const t = invoiceTotals(i.lines, i.discount, i.depositVnd);
    const paid = m.payments
      .filter((p) => p.invoiceId === i.id && p.purpose === 'invoice' && p.status === 'paid')
      .reduce((s, p) => s + p.amountVnd, 0n);
    return paid !== t.due;
  });
  report(
    badPay.length === 0,
    `${name}: hóa đơn đã thu có tổng các khoản đúng số còn phải thu (BR-21)`,
    badPay.map((i) => i.number).join(', '),
  );

  const keys = m.payments.map((p) => p.idempotencyKey);
  report(
    new Set(keys).size === keys.length,
    `${name}: mỗi khoản thanh toán một idempotency key (BR-21)`,
  );
  const entryKeys = m.walletEntries.map((e) => e.idempotencyKey);
  report(
    new Set(entryKeys).size === entryKeys.length,
    `${name}: mỗi bút toán ví một idempotency key (BR-20)`,
  );

  const negative = f.customers.filter((c) => {
    const b = walletBalance(m.walletEntries, c.id);
    return b.realVnd < 0n || b.bonusVnd < 0n;
  });
  report(negative.length === 0, `${name}: không ví nào âm`, negative.map((c) => c.id).join(', '));

  const stray = m.refunds.filter(
    (r) => r.invoiceId && !m.invoices.some((i) => i.id === r.invoiceId),
  );
  report(stray.length === 0, `${name}: mọi yêu cầu hoàn trỏ tới một hóa đơn có thật`);

  const over = m.refunds.filter((r) => {
    if (!r.invoiceId || !r.paymentId || r.status === 'rejected' || r.packageId) return false;
    const inv = m.invoices.find((i) => i.id === r.invoiceId)!;
    const p = m.payments.find((x) => x.id === r.paymentId);
    if (!p) return true;
    const others = m.refunds.filter((o) => o.id !== r.id);
    return r.amountVnd > refundable(inv, p, others).maxVnd;
  });
  report(
    over.length === 0,
    `${name}: yêu cầu hoàn không vượt số đã thu (BR-28)`,
    over.map((r) => r.id).join(', '),
  );

  const open = m.periods.filter((p) => p.status === 'open');
  report(open.length === 1, `${name}: đúng một kỳ hoa hồng đang mở (BR-42)`);
  const closedPosting = m.commission.filter((c) => {
    const period = m.periods.find((p) => p.id === c.periodId);
    return period?.status === 'closed' && c.kind === 'clawback';
  });
  report(closedPosting.length === 0, `${name}: không thu hồi hoa hồng vào kỳ đã chốt (BR-42)`);
}

{
  const m = salon.money;
  const find = (no: string) => m.invoices.find((i) => i.number === no)!;
  const status = (no: string) => invoiceStatus(find(no), m.payments, m.refunds);
  report(status('HĐ-0187') === 'draft', 'Mẫu: HĐ-0187 của chị Hà là hóa đơn nháp');
  report(status('HĐ-0184') === 'refund_pending', 'Mẫu: HĐ-0184 chờ duyệt hoàn');
  report(status('HĐ-0183') === 'refunded_partial', 'Mẫu: HĐ-0183 đã hoàn một phần');
  report(
    status('HĐ-0185') === 'paid' && status('HĐ-0186') === 'paid',
    'Mẫu: HĐ-0185, HĐ-0186 đã thu',
  );
  report(
    nextInvoiceNumber(m.invoices) === 'HĐ-0190',
    'Mẫu: hóa đơn tiếp theo là HĐ-0190 (0187–0189 là nháp)',
    nextInvoiceNumber(m.invoices),
  );
  const ha = find('HĐ-0187');
  const t = invoiceTotals(ha.lines, ha.discount, ha.depositVnd);
  report(
    t.subtotal === 500_000n && t.due === 400_000n,
    'Mẫu: nháp của chị Hà là Nhuộm tóc 500.000 ₫, cọc 100.000 ₫, còn 400.000 ₫ khi chưa thêm dòng',
    show(t),
  );
  report(collectedVnd(find('HĐ-0183'), m.payments) === 150_000n, 'Mẫu: HĐ-0183 đã thu 150.000 ₫');
  const hw = walletBalance(m.walletEntries, 'may-c-ha');
  report(
    hw.realVnd === 150_000n && hw.bonusVnd === 100_000n,
    'Mẫu: ví chị Hà còn 150.000 ₫ thật, 100.000 ₫ tặng (nạp 1.000.000 + 100.000, đã trả 850.000)',
    show(hw),
  );
  const an = salon.customers.find((c) => c.id === 'may-c-an')!;
  report(an.packages?.[0]?.remainingSessions === 2, 'Mẫu: anh Bảo An còn 2 buổi gói 5 lần gội sấy');
  report(
    m.refunds.length === 4 && m.refunds.filter((r) => r.createdBy === 'Tự động').length === 1,
    'Mẫu: 4 yêu cầu hoàn tiền, một yêu cầu "Tự động" (BR-29)',
  );
}

// ---- Collecting at the desk (BR-21, BR-22, BR-25, BR-26, BR-40) ----

{
  const NOW = '2026-11-07T03:48:00Z';
  const ctx: Ctx = {
    services: salon.services,
    catalog: salon.packageCatalog,
    commissionPercent: salon.commissionPercent,
    now: NOW,
    actor: 'Lan',
    role: 'Lễ tân',
  };
  const start: World = {
    money: salon.money,
    customers: salon.customers,
    appointments: salon.appointments,
  };
  const idOf = (no: string) => start.money.invoices.find((i) => i.number === no)!.id;
  const pay = (w: World, no: string) => w.money.payments.filter((p) => p.invoiceId === idOf(no));

  // Chị Hà: a retail line of 120.000, wallet 200.000 and cash 320.000 (khách đưa 500.000).
  const retail = {
    id: 'retail-1',
    kind: 'retail' as const,
    description: 'Dầu xả giữ màu 250 ml',
    quantity: 1,
    unitPriceVnd: 120_000n,
    staffResourceId: 'may-mai',
  };
  const haId = idOf('HĐ-0187');
  const withRetail = editInvoice(start, haId, (i) => ({ ...i, lines: [...i.lines, retail] }));
  const plan = [
    { method: 'wallet' as const, amountVnd: 200_000n },
    { method: 'cash' as const, amountVnd: 320_000n, tenderedVnd: 500_000n },
  ];
  const bad = collect(withRetail, haId, [{ method: 'cash', amountVnd: 100_000n }], ctx);
  report(
    bad.kind === 'error',
    'BR-21: tổng các khoản chưa đúng số còn phải thu thì không thu được',
    bad.kind === 'error' ? bad.message : '',
  );
  const first = collect(withRetail, haId, plan, ctx);
  report(first.kind === 'paid', 'Thu HĐ-0187 bằng ví và tiền mặt');
  if (first.kind === 'paid') {
    const w = first.world;
    const wl = pay(w, 'HĐ-0187').find((p) => p.method === 'wallet')!;
    report(
      wl.realVnd === 150_000n && wl.bonusVnd === 50_000n,
      'BR-25: ví trừ 150.000 ₫ tiền thật và 50.000 ₫ tiền tặng',
      show(wl),
    );
    const bal = walletBalance(w.money.walletEntries, 'may-c-ha');
    report(
      bal.realVnd === 0n && bal.bonusVnd === 50_000n,
      'BR-25: ví chị Hà còn 50.000 ₫ tiền tặng',
      show(bal),
    );
    const cash = pay(w, 'HĐ-0187').find((p) => p.method === 'cash')!;
    report(
      cash.tenderedVnd === 500_000n && cash.tenderedVnd! - cash.amountVnd === 180_000n,
      'BR-21: khách đưa 500.000 ₫ thì thối 180.000 ₫',
    );
    const inv = w.money.invoices.find((i) => i.id === haId)!;
    report(Boolean(inv.paidAt) && inv.collectedBy === 'Lan', 'BR-21: hóa đơn khóa sau khi thu');
    report(
      w.appointments.find((a) => a.id === 'may-a-ha')!.settled === true,
      'Lịch của chị Hà thành đã thanh toán',
    );
    const com = w.money.commission.filter((c) => c.invoiceId === haId);
    report(
      com.length === 1 &&
        com[0]!.staffResourceId === 'may-mai' &&
        com[0]!.amountVnd === 62_000n &&
        com[0]!.periodId === '2026-11',
      'BR-40: hoa hồng của Mai 62.000 ₫ vào kỳ 11/2026',
      show(com),
    );
    const again = collect(w, haId, plan, ctx);
    report(
      again.kind === 'duplicate' && pay(again.world, 'HĐ-0187').length === pay(w, 'HĐ-0187').length,
      'BR-21: bấm Thu lần hai chỉ ghi một khoản',
    );
    const cashPay = pay(w, 'HĐ-0187').find((p) => p.method === 'cash')!;
    const depPay = pay(w, 'HĐ-0187').find((p) => p.purpose === 'deposit')!;
    const ask = (amountVnd: bigint, reason: string, paymentId = cashPay.id) =>
      requestRefund(w, { invoiceId: haId, paymentId, amountVnd, reason, lineId: 'retail-1' }, ctx);
    const ok = ask(120_000n, 'Khách trả lại chai chưa mở');
    report(
      ok.error === null && ok.world.money.refunds.at(-1)?.status === 'pending',
      'BR-28: yêu cầu hoàn 120.000 ₫ từ khoản tiền mặt của HĐ-0187 chờ duyệt',
    );
    report(
      invoiceStatus(
        ok.world.money.invoices.find((i) => i.id === haId)!,
        ok.world.money.payments,
        ok.world.money.refunds,
      ) === 'refund_pending',
      'Hóa đơn có yêu cầu hoàn chờ duyệt thì thành Chờ duyệt hoàn',
    );
    report(ask(120_000n, '   ').error !== null, 'BR-28: lý do bắt buộc');
    report(ask(330_000n, 'x').error !== null, 'BR-28: hoàn không vượt số đã thu (320.000 ₫)');
    report(
      requestRefund(
        ok.world,
        { invoiceId: haId, paymentId: cashPay.id, amountVnd: 250_000n, reason: 'x' },
        ctx,
      ).error !== null,
      'BR-28: yêu cầu thứ hai không vượt phần còn lại sau yêu cầu đang chờ (200.000 ₫)',
    );
    report(
      ask(50_000n, 'x', depPay.id).error !== null,
      'BR-28: cọc đã trừ vào dịch vụ không hoàn được',
    );
    const edited = editInvoice(w, haId, (i) => ({ ...i, lines: [] }));
    report(
      edited.money.invoices.find((i) => i.id === haId)!.lines.length === 2,
      'BR-21: hóa đơn đã thu không sửa được',
    );
  }

  // Anh Bảo An: one session of the package, the rest by transfer.
  const an = start.customers.find((c) => c.id === 'may-c-an');
  const washPkg = usablePackage(an, 'may-wash-std', NOW);
  report(washPkg?.id === 'may-pkg-an-1', 'BR-26: anh Bảo An có gói áp dụng cho Gội sấy');
  const anId = idOf('HĐ-0188');
  const used = editInvoice(start, anId, (i) => ({
    ...i,
    lines: i.lines.map((l) =>
      l.serviceVariantId === 'may-wash-std' ? { ...l, packageId: washPkg!.id } : l,
    ),
  }));
  const waiting = collect(used, anId, [{ method: 'transfer', amountVnd: 150_000n }], ctx);
  report(waiting.kind === 'awaiting', 'BR-21: chuyển khoản chờ ngân hàng báo');
  if (waiting.kind === 'awaiting') {
    const w = waiting.world;
    const inv = w.money.invoices.find((i) => i.id === anId)!;
    report(
      !inv.paidAt && invoiceStatus(inv, w.money.payments, w.money.refunds) === 'awaiting_transfer',
      'Hóa đơn ở trạng thái Chờ tiền về',
    );
    const locked = editInvoice(w, anId, (i) => ({ ...i, lines: [] }));
    report(
      locked.money.invoices.find((i) => i.id === anId)!.lines.length === 2,
      'Hóa đơn chờ tiền về không sửa được',
    );
    report(
      w.customers.find((c) => c.id === 'may-c-an')!.packages![0]!.remainingSessions === 2,
      'Buổi gói chưa trừ khi tiền chưa về',
    );
    const done = confirmTransfer(w, anId, ctx);
    report(done.kind === 'paid', 'Tiền về thì hóa đơn thành Đã thu');
    if (done.kind === 'paid') {
      const pkg = done.world.customers.find((c) => c.id === 'may-c-an')!.packages![0]!;
      report(
        pkg.remainingSessions === 1 && pkg.usedSessions === 4,
        'BR-26: gói còn 1 buổi sau khi tiền về',
      );
      const twice = confirmTransfer(done.world, anId, ctx);
      report(
        twice.kind === 'duplicate' && pay(twice.world, 'HĐ-0188').length === 1,
        'BR-21: cổng báo hai lần vẫn chỉ ghi một khoản',
      );
      const com = done.world.money.commission.filter((c) => c.invoiceId === anId);
      report(
        com.length === 1 && com[0]!.amountVnd === 22_600n,
        'BR-40: hoa hồng của Hùng = 10% × 150.000 ₫ thực thu + 10% × 76.000 ₫ doanh thu buổi gói = 22.600 ₫',
        show(com),
      );
      const line = done.world.money.invoices
        .find((i) => i.id === anId)!
        .lines.find((l) => l.packageId)!;
      report(
        line.sessionRevenueVnd === 76_000n,
        'BR-26: buổi thứ 4 của gói 380.000 ₫ / 5 buổi ghi doanh thu 76.000 ₫ vào dòng',
        show(line.sessionRevenueVnd),
      );
      report(
        done.world.money.commission.filter((c) => c.invoiceId === anId).length === 1,
        'BR-40: hoa hồng của một người trên một hóa đơn chỉ một dòng, gộp cả phần buổi gói',
      );
    }
    const back = cancelTransfer(w, anId);
    report(
      pay(back, 'HĐ-0188').length === 0 &&
        back.money.invoices.find((i) => i.id === anId)!.held === undefined,
      'Đổi phương thức bỏ mã chuyển khoản',
    );
  }

  // A top-up and a package sale go through the same desk.
  const topup = newDraft(
    start,
    {
      customerId: 'may-c-ha',
      lines: [
        {
          kind: 'wallet_topup',
          description: 'Nạp ví',
          quantity: 1,
          unitPriceVnd: 1_000_000n,
          bonusVnd: topupBonus(1_000_000n, salon.topupBonusTiers),
        },
      ],
    },
    ctx,
  );
  const topped = collect(
    topup.world,
    topup.invoice.id,
    [{ method: 'cash', amountVnd: 1_000_000n }],
    ctx,
  );
  if (topped.kind === 'paid') {
    const bal = walletBalance(topped.world.money.walletEntries, 'may-c-ha');
    report(
      bal.realVnd === 1_150_000n && bal.bonusVnd === 200_000n,
      'BR-25: nạp 1.000.000 ₫ cho chị Hà thêm 100.000 ₫ tiền tặng',
      show(bal),
    );
  } else report(false, 'Nạp ví', topped.kind);
  const sale = newDraft(
    start,
    {
      customerId: 'may-c-ha',
      lines: [
        {
          kind: 'package_sale',
          description: 'Gói 10 lần gội sấy',
          quantity: 1,
          unitPriceVnd: 700_000n,
          productId: 'may-pkg-10',
        },
      ],
    },
    ctx,
  );
  const sold = collect(sale.world, sale.invoice.id, [{ method: 'card', amountVnd: 700_000n }], ctx);
  if (sold.kind === 'paid') {
    const pkg = sold.world.customers.find((c) => c.id === 'may-c-ha')!.packages?.[0];
    report(
      pkg?.remainingSessions === 10 &&
        pkg.unitPriceVnd === 80_000n &&
        pkg.expiresAt === '06/05/2027',
      'BR-26: bán gói 10 lần cho chị Hà, hạn 180 ngày (06/05/2027), giá lẻ lúc mua 80.000 ₫',
      pkg ? pkg.expiresAt : '',
    );
  } else report(false, 'Bán gói', sold.kind);
  // BR-22: a deposit of 100.000 ₫ on an invoice of 80.000 ₫ leaves 20.000 ₫ for the wallet.
  const smallId = idOf('HĐ-0187');
  const small = editInvoice(start, smallId, (i) => ({
    ...i,
    lines: i.lines.map((l) => ({ ...l, unitPriceVnd: 80_000n })),
  }));
  const excessTotals = invoiceTotals(
    small.money.invoices.find((i) => i.id === smallId)!.lines,
    undefined,
    100_000n,
  );
  report(
    excessTotals.depositApplied === 80_000n &&
      excessTotals.depositUnused === 20_000n &&
      excessTotals.due === 0n,
    'BR-22: cọc 100.000 ₫, hóa đơn 80.000 ₫ → trừ 80.000 ₫, thừa 20.000 ₫, còn phải thu 0 ₫',
    show(excessTotals),
  );
  const settled = collect(small, smallId, [], ctx);
  if (settled.kind === 'paid') {
    const w = settled.world;
    const e = w.money.walletEntries.filter((x) => x.kind === 'deposit_excess');
    report(
      e.length === 1 &&
        e[0]!.customerId === 'may-c-ha' &&
        e[0]!.realVnd === 20_000n &&
        e[0]!.bonusVnd === 0n &&
        e[0]!.invoiceId === smallId,
      'BR-22: cọc thừa 20.000 ₫ vào ví chị Hà thành bút toán deposit_excess, toàn tiền thật',
      show(e),
    );
    const bal = walletBalance(w.money.walletEntries, 'may-c-ha');
    report(
      bal.realVnd === 170_000n && bal.bonusVnd === 100_000n,
      'BR-25: ví chị Hà 150.000 ₫ + 20.000 ₫ thật, 100.000 ₫ tặng, cọc thừa rút được',
      show(bal),
    );
    const again = collect(w, smallId, [], ctx);
    report(
      again.kind === 'duplicate' &&
        again.world.money.walletEntries.filter((x) => x.kind === 'deposit_excess').length === 1,
      'BR-21: bấm Thu lần hai không ghi cọc thừa lần nữa',
    );
    const dep = w.money.payments.find((p) => p.invoiceId === smallId && p.purpose === 'deposit')!;
    const inv = w.money.invoices.find((i) => i.id === smallId)!;
    report(
      refundable(inv, dep, w.money.refunds).maxVnd === 0n,
      'BR-28: phần cọc thừa đã vào ví nên khoản cọc không hoàn lần nữa',
    );
    report(
      collectedVnd(inv, w.money.payments) === 0n,
      'Hóa đơn thu 0 ₫: cọc không tính là tiền thu của hóa đơn',
    );
  } else report(false, 'Thu hóa đơn có cọc thừa', settled.kind);
  const noExcess = collect(start, idOf('HĐ-0186'), [], ctx);
  report(noExcess.kind !== 'paid', 'Hóa đơn đã thu không thu lại');
  const drafted = ensureDraft(
    start,
    salon.appointments.find((a) => a.id === 'may-a-ha')!,
    ctx,
  );
  report(drafted === start, 'Mỗi lịch chỉ một hóa đơn nháp');
}

// ---- Deciding a refund (BR-27, BR-28, BR-29, BR-42, BR-63) ----

{
  const NOW = '2026-11-07T04:10:00Z';
  const ctx: Ctx = {
    services: salon.services,
    catalog: salon.packageCatalog,
    commissionPercent: salon.commissionPercent,
    now: NOW,
    actor: 'Hùng',
    role: 'Quản lý',
  };
  const start: World = {
    money: salon.money,
    customers: salon.customers,
    appointments: salon.appointments,
  };
  const idOf = (no: string) => start.money.invoices.find((i) => i.number === no)!.id;

  // HĐ-0184: the pending request of 80.000 ₫ cash by Lan.
  const pending = start.money.refunds.find((r) => r.id === 'rf-0184')!;
  const fx = approvalEffects(start, pending, ctx.commissionPercent);
  report(
    fx.clawback.length === 1 &&
      fx.clawback[0]!.staffResourceId === 'may-lan' &&
      fx.clawback[0]!.amountVnd === -8_000n &&
      fx.periodLabel === '11/2026' &&
      fx.status === 'refunded',
    'BR-42: duyệt hoàn 80.000 ₫ của HĐ-0184 thu hồi −8.000 ₫ hoa hồng của Lan vào kỳ 11/2026, hóa đơn thành Đã hoàn',
    show(fx),
  );
  const done = approveRefund(start, 'rf-0184', ctx);
  report(done.error === null, 'Quản lý duyệt yêu cầu hoàn của HĐ-0184');
  const w = done.world;
  const inv = w.money.invoices.find((i) => i.id === idOf('HĐ-0184'))!;
  report(
    invoiceStatus(inv, w.money.payments, w.money.refunds) === 'refunded',
    'BR-28: duyệt xong hóa đơn thành Đã hoàn',
  );
  report(
    w.money.commission.some((c) => c.id === 'com-rf-0184-may-lan' && c.amountVnd === -8_000n),
    'BR-42: có một dòng thu hồi hoa hồng',
  );
  report(
    w.money.audit.some(
      (a) => a.action === 'Duyệt hoàn tiền' && a.by === 'Hùng' && a.role === 'Quản lý',
    ),
    'BR-63: duyệt hoàn tiền được ghi nhật ký',
  );
  report(
    approveRefund(w, 'rf-0184', ctx).world === w,
    'Duyệt hai lần: yêu cầu đã xử lý thì không đổi gì',
  );

  const bad = rejectRefund(start, 'rf-0184', '  ', ctx);
  report(bad.error !== null, 'BR-28: từ chối cần ghi chú');
  const no = rejectRefund(start, 'rf-0184', 'Khách đã nhận lại tiền ở quầy', ctx);
  report(
    no.error === null &&
      no.world.money.refunds.find((r) => r.id === 'rf-0184')!.status === 'rejected' &&
      !no.world.money.commission.some((c) => c.id.startsWith('com-rf-0184')),
    'Từ chối không thu hồi hoa hồng và không trả tiền',
  );

  // A wallet payment goes back to the wallet in the same ratio (BR-28).
  const wallet: Payment = {
    id: 'pay-w',
    invoiceId: 'inv-0184',
    purpose: 'invoice',
    method: 'wallet',
    amountVnd: 80_000n,
    realVnd: 60_000n,
    bonusVnd: 20_000n,
    code: 'WL-0184',
    at: NOW,
    status: 'paid',
    idempotencyKey: 'k-wallet',
  };
  const walletWorld: World = {
    ...start,
    money: {
      ...start.money,
      payments: [...start.money.payments, wallet],
      refunds: start.money.refunds.map((r) =>
        r.id === 'rf-0184' ? { ...r, paymentId: 'pay-w', method: 'wallet' as const } : r,
      ),
    },
  };
  const back = approveRefund(walletWorld, 'rf-0184', ctx).world;
  const ledgerEntry = back.money.walletEntries.find((e) => e.id === 'wl-rf-0184')!;
  report(
    ledgerEntry.realVnd === 60_000n &&
      ledgerEntry.bonusVnd === 20_000n &&
      ledgerEntry.kind === 'refund',
    'BR-28: hoàn khoản trả bằng ví thì ví nhận lại 60.000 ₫ thật, 20.000 ₫ tặng',
    show(ledgerEntry),
  );

  // BR-29: a deposit that came late is given back at once, once.
  const auto = addAutoRefund(start.money, {
    key: 'x1',
    amountVnd: 100_000n,
    slotLabel: '14:00',
    at: NOW,
  });
  const last = auto.refunds.at(-1)!;
  report(
    last.status === 'auto' && last.createdBy === 'Tự động' && last.invoiceId === null,
    'BR-29: cọc về muộn, giờ đã mất → yêu cầu "Tự động", không cần duyệt',
  );
  report(
    addAutoRefund(auto, { key: 'x1', amountVnd: 100_000n, slotLabel: '14:00', at: NOW }) === auto,
    'BR-29: một lịch chỉ một lần hoàn tự động',
  );

  // Giving a package session back (BR-28): a refund about a line that used one.
  const sessionWorld = (() => {
    const base = collect(
      editInvoice(start, idOf('HĐ-0188'), (i) => ({
        ...i,
        lines: i.lines.map((l) =>
          l.serviceVariantId === 'may-wash-std' ? { ...l, packageId: 'may-pkg-an-1' } : l,
        ),
      })),
      idOf('HĐ-0188'),
      [{ method: 'cash', amountVnd: 150_000n }],
      { ...ctx, actor: 'Lan' },
    );
    return base.kind === 'paid' ? base.world : null;
  })();
  if (sessionWorld) {
    const lineId = sessionWorld.money.invoices
      .find((i) => i.id === idOf('HĐ-0188'))!
      .lines.find((l) => l.packageId)!.id;
    const payment = sessionWorld.money.payments.find(
      (p) => p.invoiceId === idOf('HĐ-0188') && p.method === 'cash',
    )!;
    const asked = requestRefund(
      sessionWorld,
      {
        invoiceId: idOf('HĐ-0188'),
        paymentId: payment.id,
        amountVnd: 0n,
        reason: 'Xin lại buổi',
        lineId,
      },
      ctx,
    );
    report(asked.error === null, 'BR-28: dòng dùng buổi gói xin lại buổi, không kèm tiền');
    const id = asked.world.money.refunds.at(-1)!.id;
    const approved = approveRefund(asked.world, id, ctx).world;
    const pkg = approved.customers.find((c) => c.id === 'may-c-an')!.packages![0]!;
    report(
      pkg.remainingSessions === 2 && pkg.usedSessions === 3,
      'BR-28: duyệt thì buổi gói được trả lại (còn 2 buổi như trước khi dùng)',
      show(pkg),
    );
    const back = approved.money.commission.find((c) => c.id === `com-${id}-may-hung`);
    report(
      back?.amountVnd === -7_600n && back.kind === 'clawback' && back.periodId === '2026-11',
      'BR-26, BR-42: hoàn buổi gói thu hồi đúng 7.600 ₫ hoa hồng của phần doanh thu 76.000 ₫, vào kỳ đang mở',
      show(back),
    );
    const earned = approved.money.commission
      .filter((c) => c.invoiceId === idOf('HĐ-0188'))
      .reduce((m, c) => m + c.amountVnd, 0n);
    report(
      earned === 15_000n,
      'Sau khi hoàn buổi gói, hoa hồng của hóa đơn còn lại 15.000 ₫ (phần tiền thực thu)',
      show(earned),
    );
  } else report(false, 'Thu HĐ-0188 bằng tiền mặt để thử hoàn buổi gói');

  // BR-27: giving a package sale back.
  const sale = newDraft(
    start,
    {
      customerId: 'may-c-ha',
      lines: [
        {
          kind: 'package_sale',
          description: 'Gói 10 lần gội sấy',
          quantity: 1,
          unitPriceVnd: 700_000n,
          productId: 'may-pkg-10',
        },
      ],
    },
    ctx,
  );
  const paidSale = collect(
    sale.world,
    sale.invoice.id,
    [{ method: 'transfer', amountVnd: 700_000n }],
    ctx,
  );
  if (paidSale.kind === 'awaiting') {
    const got = confirmTransfer(paidSale.world, sale.invoice.id, ctx);
    if (got.kind === 'paid') {
      const pay = got.world.money.payments.find((p) => p.invoiceId === sale.invoice.id)!;
      const pkg = got.world.customers.find((c) => c.id === 'may-c-ha')!.packages!.at(-1)!;
      const amount = packageRefund(pkg.priceVnd!, pkg.unitPriceVnd!, 0, 50_000n);
      const ask = requestRefund(
        got.world,
        {
          invoiceId: sale.invoice.id,
          paymentId: pay.id,
          amountVnd: amount,
          reason: 'Đổi ý',
          packageId: pkg.id,
          feeVnd: 50_000n,
        },
        ctx,
      );
      const rid = ask.world.money.refunds.at(-1)!.id;
      const fin = approveRefund(ask.world, rid, ctx).world;
      report(
        amount === 650_000n &&
          fin.customers.find((c) => c.id === 'may-c-ha')!.packages!.at(-1)!.refunded === true,
        'BR-27: hoàn gói chưa dùng buổi nào, phí 50.000 ₫ → 650.000 ₫, gói không dùng được nữa',
      );
      report(
        usablePackage(
          fin.customers.find((c) => c.id === 'may-c-ha'),
          'may-wash-std',
          NOW,
        ) === undefined,
        'Gói đã hoàn không còn áp dụng được cho dịch vụ',
      );
    }
  }
}

console.log(failures === 0 ? '\nTất cả đạt.' : `\n${failures} mục không đạt.`);
process.exit(failures === 0 ? 0 : 1);
