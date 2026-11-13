/*
 * Checks the arithmetic of money (mock/money.ts) against the worked examples of
 * content/docs/nghiep-vu/quy-tac.md (BR-22, BR-25, BR-26, BR-27, BR-28, BR-40, BR-42), a sweep of
 * random amounts for the invariants, and the sample money data.
 * Run: pnpm check:money   (Node 24 runs TypeScript directly)
 */
import { tenantFixtures } from '../mock/fixtures/index.ts';
import type { Invoice, InvoiceLine, Payment, RefundRequest } from '../mock/fixtures/types.ts';
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

console.log(failures === 0 ? '\nTất cả đạt.' : `\n${failures} mục không đạt.`);
process.exit(failures === 0 ? 0 : 1);
