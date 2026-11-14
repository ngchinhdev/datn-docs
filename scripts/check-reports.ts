/*
 * Checks the commission rules and periods (mock/commission.ts, BR-40 to BR-42) and the numbers of
 * the reports (mock/reports.ts, BR-45 to BR-47) against the worked examples of
 * content/docs/nghiep-vu/quy-tac.md and the sample data.
 * Run: pnpm check:reports   (Node 24 runs TypeScript directly)
 */
import {
  canClose,
  clawbackEntries,
  closePeriod,
  closeReminderDue,
  earnEntries,
  periodRange,
  periodState,
  periodSummary,
  periodTotals,
  postEntries,
  ruleFor,
} from '../mock/commission.ts';
import { tenantFixtures } from '../mock/fixtures/index.ts';
import type { CommissionRule, Invoice, InvoiceLine } from '../mock/fixtures/types.ts';
import { todoItems } from '../mock/overview.ts';
import { collect, type Ctx, type World } from '../mock/money-ops.ts';
import { approveRefund } from '../mock/money-refunds.ts';
import {
  busyMinutes,
  byDay,
  byService,
  byStaff,
  cashIn,
  changePercent,
  noShows,
  occupancy,
  previousRange,
  prepaidHeld,
  revenueItems,
  revenueRealised,
  sameDaysLastMonth,
  shiftMinutes,
  type ReportInput,
} from '../mock/reports.ts';
import { MOCK_NOW, MOCK_TODAY } from '../mock/time.ts';
import type { Appointment, MoneyState, Payment, StaffTimeOff } from '../mock/fixtures/types.ts';

let failures = 0;
const report = (ok: boolean, name: string, detail = '') => {
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` :: ${detail}` : ''}`);
};
const show = (v: unknown) =>
  JSON.stringify(v, (_key, value) => (typeof value === 'bigint' ? `${value}n` : value));

const salon = tenantFixtures.find((f) => f.tenant.slug === 'toc-may')!;
const levelOf = (id: string) => salon.staff.find((s) => s.resourceId === id)?.level;
const rules = salon.money.commissionRules;

const dye = { retail: false, serviceId: 'may-dye', level: 2 } as const;

// ---- BR-41: which rule a line falls under ----

{
  const day = '2026-11-07';
  report(
    ruleFor(rules, { ...dye, date: day })?.id === 'may-rule-1',
    'BR-41: hôm nay Mai nhuộm tóc theo quy tắc mọi dịch vụ 10% (quy tắc 12% chưa tới ngày)',
  );
  report(
    ruleFor(rules, { ...dye, date: '2026-11-30' })?.percent === 10 &&
      ruleFor(rules, { ...dye, date: '2026-12-01' })?.percent === 12,
    'BR-41: quy tắc 01/12 không áp cho hóa đơn 30/11, áp từ 01/12 (Nhuộm tóc, Thợ chính 12%)',
  );
  report(
    ruleFor(rules, { retail: false, serviceId: 'may-dye', level: 1, date: '2026-12-01' })
      ?.percent === 10,
    'BR-41: thợ cấp 1 nhuộm tóc sau 01/12 vẫn 10% (quy tắc 12% chỉ cho Thợ chính)',
  );
  report(
    ruleFor(rules, { retail: true, level: 2, date: day })?.percent === 5,
    'BR-41: dòng bán lẻ theo quy tắc bán lẻ 5%',
  );
  report(
    ruleFor(
      rules.filter((r) => r.scope !== 'retail'),
      { retail: true, date: day },
    ) === null,
    'BR-41: không có quy tắc bán lẻ thì dòng bán lẻ không có hoa hồng, kể cả khi có quy tắc mọi dịch vụ',
  );

  const wash: CommissionRule = {
    id: 'x-wash',
    scope: 'service',
    serviceId: 'may-wash',
    percent: 15,
    effectiveFrom: day,
  };
  const withWash = [...rules, wash];
  report(
    ruleFor(withWash, { retail: false, serviceId: 'may-wash', level: 1, date: day })?.percent ===
      15 &&
      ruleFor(withWash, { retail: false, serviceId: 'may-cut', level: 1, date: day })?.percent ===
        10,
    'BR-41: thêm "Gội sấy, mọi cấp, 15%, từ hôm nay" thì gội sấy 15%, cắt tóc vẫn 10%',
  );
  const order: CommissionRule[] = [
    { id: 'o1', scope: 'all', percent: 10, effectiveFrom: '2026-10-01' },
    { id: 'o2', scope: 'all', level: 2, percent: 11, effectiveFrom: '2026-10-01' },
    { id: 'o3', scope: 'service', serviceId: 'may-dye', percent: 12, effectiveFrom: '2026-10-01' },
    {
      id: 'o4',
      scope: 'service',
      serviceId: 'may-dye',
      level: 2,
      percent: 13,
      effectiveFrom: '2026-10-01',
    },
  ];
  const pick = (list: CommissionRule[]) => ruleFor(list, { ...dye, date: day })?.id;
  report(
    pick(order) === 'o4' &&
      pick(order.slice(0, 3)) === 'o3' &&
      pick([order[0]!, order[1]!]) === 'o2' &&
      pick([order[0]!]) === 'o1',
    'BR-41: dịch vụ và cấp > dịch vụ > mọi dịch vụ và cấp > mọi dịch vụ',
  );
  const newer: CommissionRule[] = [
    { id: 'n1', scope: 'all', percent: 10, effectiveFrom: '2026-10-01' },
    { id: 'n2', scope: 'all', percent: 8, effectiveFrom: '2026-11-03' },
  ];
  report(
    ruleFor(newer, { ...dye, date: '2026-11-02' })?.percent === 10 &&
      ruleFor(newer, { ...dye, date: '2026-11-03' })?.percent === 8,
    'BR-41: sửa quy tắc đã áp là thêm quy tắc mới cùng phạm vi; hóa đơn trước ngày hiệu lực giữ tỉ lệ cũ',
  );
}

// ---- BR-40: what each line earns ----

const line = (
  over: Partial<InvoiceLine> & Pick<InvoiceLine, 'id' | 'unitPriceVnd'>,
): InvoiceLine => ({
  kind: 'service',
  description: 'x',
  quantity: 1,
  ...over,
});

{
  const at = '2026-11-07T03:00:00Z';
  const lines = [
    line({
      id: 'a',
      unitPriceVnd: 500_000n,
      staffResourceId: 'may-mai',
      serviceVariantId: 'may-dye-short',
    }),
    line({ id: 'b', kind: 'retail', unitPriceVnd: 120_000n, staffResourceId: 'may-mai' }),
    line({ id: 'c', kind: 'retail', unitPriceVnd: 80_000n }),
    line({
      id: 'd',
      unitPriceVnd: 80_000n,
      staffResourceId: 'may-lan',
      serviceVariantId: 'may-wash-std',
      packageId: 'pkg',
      sessionRevenueVnd: 70_000n,
      sessionNo: 4,
    }),
  ];
  const invoice = { id: 'inv-t', lines } as Invoice;
  const got = earnEntries({
    invoice,
    lines,
    discountVnd: 0n,
    rules,
    services: salon.services,
    levelOf,
    at,
  });
  const byLine = Object.fromEntries(got.map((e) => [e.lineId, e]));
  report(
    byLine['a']?.amountVnd === 50_000n && byLine['a'].baseVnd === 500_000n,
    'BR-40: Nhuộm tóc 500.000 ₫ × 10% = 50.000 ₫',
    show(byLine['a']),
  );
  report(
    byLine['b']?.amountVnd === 6_000n && byLine['b'].source === 'retail',
    'BR-40: bán lẻ 120.000 ₫ × 5% = 6.000 ₫ cho người bán',
    show(byLine['b']),
  );
  report(
    byLine['c'] === undefined,
    'BR-40: dòng bán lẻ để trống người bán thì không ai có hoa hồng',
  );
  report(
    byLine['d']?.baseVnd === 70_000n &&
      byLine['d'].amountVnd === 7_000n &&
      byLine['d'].sessionNo === 4,
    'BR-26, BR-40: buổi gói tính trên doanh thu của buổi (70.000 ₫), không phải 0 ₫ thực thu',
    show(byLine['d']),
  );
  report(
    got.every((e) => e.periodId === '2026-11' && e.ruleId !== undefined),
    'BR-42: khoản hoa hồng vào kỳ của ngày thu tiền và nhớ quy tắc đã áp',
  );
  const discounted = earnEntries({
    invoice,
    lines: [lines[0]!],
    discountVnd: 50_000n,
    rules,
    services: salon.services,
    levelOf,
    at,
  });
  report(
    discounted[0]?.baseVnd === 450_000n && discounted[0].amountVnd === 45_000n,
    'BR-40: tính trên số thực thu sau giảm giá (450.000 ₫ × 10%)',
  );
  report(
    earnEntries({
      invoice,
      lines: [lines[0]!],
      discountVnd: 0n,
      rules,
      services: salon.services,
      levelOf,
      at: '2026-11-30T17:30:00Z',
    })[0]?.periodId === '2026-12',
    'BR-42: 17:30 UTC ngày 30/11 là 00:30 ngày 01/12 ở chi nhánh, vào kỳ 12/2026',
  );
}

// ---- BR-42: periods ----

{
  const periods = Object.fromEntries(salon.money.periods.map((p) => [p.id, p]));
  report(
    periodState(periods['2026-09']!, MOCK_TODAY) === 'closed' &&
      periodState(periods['2026-10']!, MOCK_TODAY) === 'ended' &&
      periodState(periods['2026-11']!, MOCK_TODAY) === 'open',
    'Mẫu: 09/2026 đã chốt, 10/2026 hết kỳ chưa chốt, 11/2026 đang mở',
  );
  const range = periodRange('2026-02');
  report(range.from === '2026-02-01' && range.to === '2026-02-28', 'Kỳ tháng 2 kết thúc 28/02');
  report(
    closeReminderDue(periods['2026-10']!, '2026-11-07') &&
      !closeReminderDue(periods['2026-10']!, '2026-11-06') &&
      !closeReminderDue(periods['2026-11']!, '2026-11-07') &&
      !closeReminderDue(periods['2026-09']!, '2026-11-07'),
    'BR-42: hết tháng 7 ngày chưa chốt thì Tổng quan nhắc (kỳ 10/2026 đúng ngày 07/11, không nhắc kỳ đang mở hay đã chốt)',
  );
  report(
    canClose(periods['2026-10']!, MOCK_TODAY) && !canClose(periods['2026-11']!, MOCK_TODAY),
    'BR-42: chỉ chốt được tháng đã hết',
  );

  const actor = { name: 'Chính Nguyễn', role: 'Chủ cơ sở' };
  const tooEarly = closePeriod(salon.money, '2026-11', { now: '2026-11-07T04:00:00Z', actor });
  report(
    tooEarly.error !== null && tooEarly.money === salon.money,
    'BR-42: kỳ 11/2026 chưa chốt được',
  );
  const closed = closePeriod(salon.money, '2026-10', { now: '2026-11-07T04:00:00Z', actor });
  const oct = closed.money.periods.find((p) => p.id === '2026-10')!;
  report(
    closed.error === null &&
      oct.status === 'closed' &&
      oct.closedBy === 'Chính Nguyễn' &&
      closed.money.audit.at(-1)?.action === 'Chốt kỳ hoa hồng',
    'BR-42, BR-63: chốt kỳ 10/2026 khóa kỳ và ghi nhật ký',
  );
  report(
    closePeriod(closed.money, '2026-10', { now: '2026-11-07T04:00:00Z', actor }).error !== null,
    'BR-42: kỳ đã chốt không chốt lại',
  );

  const before = periodSummary(closed.money.commission, '2026-10');
  const stray = clawbackEntries({
    refundId: 'rf-late',
    invoice: { id: 'inv-late', lines: [] } as unknown as Invoice,
    earned: [],
    refundVnd: 1n,
    discountVnd: 0n,
    at: '2026-10-20T03:00:00Z',
    fallback: () => ({ percent: 10 }),
  });
  report(stray.length === 0, 'Hoàn tiền không có dòng nào để thu hồi thì không ghi gì');
  const sneaked = postEntries(
    closed.money,
    closed.money.commission.filter((c) => c.periodId === '2026-10').slice(0, 1),
  );
  report(
    sneaked.commission.length === closed.money.commission.length &&
      periodSummary(sneaked.commission, '2026-10').totalVnd === before.totalVnd,
    'BR-42: kỳ đã chốt không nhận thêm khoản nào, tổng không đổi',
  );
}

// ---- BR-28, BR-42: the clawback of a refund ----

{
  const NOW = '2026-11-25T04:10:00Z';
  const raised: CommissionRule = {
    id: 'x-up',
    scope: 'all',
    percent: 20,
    effectiveFrom: '2026-11-20',
  };
  const world: World = {
    money: { ...salon.money, commissionRules: [...rules, raised] },
    customers: salon.customers,
    appointments: salon.appointments,
  };
  const ctx: Ctx = {
    services: salon.services,
    catalog: salon.packageCatalog,
    levelOf,
    now: NOW,
    actor: 'Hùng',
    role: 'Quản lý',
  };
  const done = approveRefund(world, 'rf-0184', ctx);
  const back = done.world.money.commission.find((c) => c.id === 'com-rf-0184-inv-0184-l0');
  report(
    done.error === null &&
      back?.amountVnd === -8_000n &&
      back.percent === 10 &&
      back.periodId === '2026-11',
    'BR-42: thu hồi theo tỉ lệ đã tính cho dòng gốc (10%) dù quy tắc đã tăng lên 20%, vào kỳ của ngày duyệt',
    show(back),
  );

  const octRefund = salon.money.refunds.find((r) => r.decidedAt?.startsWith('2026-11-05'))!;
  const octClaw = salon.money.commission.filter(
    (c) => c.kind === 'clawback' && c.invoiceId === octRefund.invoiceId,
  );
  const octEarn = salon.money.commission.find(
    (c) => c.kind === 'earn' && c.invoiceId === octRefund.invoiceId,
  )!;
  report(
    octClaw.length === 1 &&
      octClaw[0]!.periodId === '2026-11' &&
      octEarn.periodId === '2026-10' &&
      octClaw[0]!.amountVnd === -15_000n &&
      octClaw[0]!.staffResourceId === 'may-mai',
    'BR-42: hoàn 150.000 ₫ duyệt 05/11 cho hóa đơn tháng 10 thu hồi −15.000 ₫ của Mai vào kỳ 11/2026, kỳ 10/2026 giữ nguyên',
    show(octClaw),
  );
  report(
    periodSummary(salon.money.commission, '2026-10').clawbackVnd === 0n,
    'Mẫu: kỳ 10/2026 không có khoản thu hồi',
  );
}

// ---- The sample data ----

for (const f of tenantFixtures) {
  const name = f.tenant.name;
  const m = f.money;
  const lineIds = new Set(m.invoices.flatMap((i) => i.lines.map((l) => l.id)));
  report(
    m.commission.every((c) => lineIds.has(c.lineId)),
    `${name}: mỗi khoản hoa hồng gắn với một dòng hóa đơn`,
  );
  report(
    new Set(m.commission.map((c) => c.id)).size === m.commission.length,
    `${name}: mã các khoản hoa hồng không trùng`,
  );
  report(
    m.commission
      .filter((c) => c.kind === 'earn')
      .every(
        (c) => c.periodId === new Date(Date.parse(c.at) + 7 * 3_600_000).toISOString().slice(0, 7),
      ),
    `${name}: khoản hoa hồng nằm trong kỳ của ngày thu tiền (BR-42)`,
  );
  const sum = periodTotals(m.commission, '2026-11').reduce((s, r) => s + r.totalVnd, 0n);
  report(
    sum === periodSummary(m.commission, '2026-11').totalVnd,
    `${name}: tổng kỳ bằng tổng từng người`,
  );
}

// ---- BR-45, BR-46: revenue, money in, prepaid ----

const at = (date: string, hhmm: string) => new Date(`${date}T${hhmm}:00+07:00`).toISOString();
const emptyMoney: MoneyState = {
  commissionRules: rules,
  invoices: [],
  payments: [],
  walletEntries: [],
  refunds: [],
  commission: [],
  periods: [],
  audit: [],
};
const inputOf = (money: MoneyState, extra: Partial<ReportInput> = {}): ReportInput => ({
  fixture: salon,
  services: salon.services,
  money,
  appointments: [],
  shifts: [],
  timeOff: [],
  now: MOCK_NOW,
  ...extra,
});
const pay = (
  over: Partial<Payment> & Pick<Payment, 'id' | 'invoiceId' | 'amountVnd' | 'at'>,
): Payment => ({
  purpose: 'invoice',
  method: 'transfer',
  code: 'x',
  status: 'paid',
  idempotencyKey: over.id,
  ...over,
});
const week = { from: '2026-11-02', to: '2026-11-08' };

{
  const sale: Invoice = {
    id: 'i1',
    number: 'HĐ-1',
    customerId: 'c',
    createdAt: at('2026-11-03', '10:00'),
    paidAt: at('2026-11-03', '10:00'),
    depositVnd: 0n,
    lines: [line({ id: 'i1-l0', kind: 'package_sale', unitPriceVnd: 350_000n, productId: 'p' })],
  };
  const session: Invoice = {
    id: 'i2',
    number: 'HĐ-2',
    customerId: 'c',
    createdAt: at('2026-11-04', '10:00'),
    paidAt: at('2026-11-04', '10:00'),
    depositVnd: 0n,
    lines: [
      line({
        id: 'i2-l0',
        unitPriceVnd: 80_000n,
        staffResourceId: 'may-mai',
        serviceVariantId: 'may-wash-std',
        packageId: 'pk',
        sessionRevenueVnd: 70_000n,
        sessionNo: 1,
      }),
    ],
  };
  const money: MoneyState = {
    ...emptyMoney,
    invoices: [sale, session],
    payments: [pay({ id: 'p1', invoiceId: 'i1', amountVnd: 350_000n, at: sale.paidAt! })],
  };
  const input = inputOf(money);
  const cash = cashIn(input, week);
  const held = prepaidHeld(input, '2026-11-08');
  report(
    cash.totalVnd === 350_000n &&
      revenueRealised(input, week) === 70_000n &&
      held.packagesVnd === 280_000n,
    'BR-45, BR-46: gói 5 buổi 350.000 ₫ dùng 1 buổi: tiền thu vào 350.000 ₫, doanh thu thực hiện 70.000 ₫, trả trước còn 280.000 ₫',
    show({ cash, held }),
  );
  report(
    cash.prepaidVnd === 350_000n,
    'BR-46: tiền bán gói được kể là tiền trả trước trong tiền thu vào',
  );

  const walletPaid: Invoice = {
    id: 'i3',
    number: 'HĐ-3',
    customerId: 'c',
    createdAt: at('2026-11-05', '10:00'),
    paidAt: at('2026-11-05', '10:00'),
    depositVnd: 0n,
    lines: [
      line({
        id: 'i3-l0',
        unitPriceVnd: 100_000n,
        staffResourceId: 'may-lan',
        serviceVariantId: 'may-cut-short',
      }),
    ],
  };
  const withWallet = inputOf({
    ...money,
    invoices: [...money.invoices, walletPaid],
    payments: [
      ...money.payments,
      pay({
        id: 'p3',
        invoiceId: 'i3',
        amountVnd: 100_000n,
        at: walletPaid.paidAt!,
        method: 'wallet',
      }),
    ],
  });
  report(
    cashIn(withWallet, week).totalVnd === 350_000n &&
      revenueRealised(withWallet, week) === 170_000n,
    'BR-46: trả bằng ví không là tiền thu vào, nhưng dịch vụ vẫn là doanh thu thực hiện',
  );

  const topup = inputOf({
    ...emptyMoney,
    walletEntries: [
      {
        id: 'w1',
        customerId: 'c',
        at: at('2026-11-03', '09:00'),
        realVnd: 1_000_000n,
        bonusVnd: 100_000n,
        kind: 'topup',
        memo: '',
        idempotencyKey: 'w1',
      },
    ],
  });
  report(
    prepaidHeld(topup, '2026-11-08').walletVnd === 1_000_000n &&
      prepaidHeld(topup, '2026-11-02').walletVnd === 0n,
    'BR-46: trả trước còn giữ chỉ tính tiền thật trong ví, tính tới cuối khoảng, không tính tiền tặng',
  );
}

{
  // The sample month: the October refund takes 150.000 ₫ off 05/11, not off October.
  const input = inputOf(salon.money, {
    appointments: salon.appointments,
    shifts: salon.shifts,
    timeOff: salon.staffTimeOff,
  });
  const refund = salon.money.refunds.find((r) => r.decidedAt?.startsWith('2026-11-05'))!;
  const day = { from: '2026-11-05', to: '2026-11-05' };
  const items = revenueItems(input, day).filter((i) => i.amountVnd < 0n);
  report(
    items.length === 1 && items[0]!.amountVnd === -refund.amountVnd,
    'BR-45: hoàn tiền trừ vào doanh thu của ngày duyệt hoàn (05/11)',
    show(items),
  );
  const oct = { from: '2026-10-01', to: '2026-10-31' };
  report(
    revenueItems(input, oct).every((i) => i.amountVnd >= 0n),
    'BR-45: doanh thu tháng 10 không bị trừ khoản hoàn duyệt tháng 11',
  );
  for (const [name, range] of [
    ['tháng 10', oct],
    ['01–07/11', { from: '2026-11-01', to: '2026-11-07' }],
  ] as const) {
    const total = revenueRealised(input, range);
    const staffSum = byStaff(input, range).reduce((m, r) => m + r.revenueVnd, 0n);
    const serviceSum = byService(input, range).reduce((m, r) => m + r.revenueVnd, 0n);
    const daySum = byDay(input, range).reduce((m, r) => m + r.revenueVnd, 0n);
    report(
      total > 0n && staffSum === total && serviceSum === total && daySum === total,
      `BR-45: ${name}: tổng theo nhân viên, theo dịch vụ, theo ngày đều bằng doanh thu thực hiện`,
      show({ total, staffSum, serviceSum, daySum }),
    );
  }
  const range = { from: '2026-11-01', to: '2026-11-07' };
  const prev = sameDaysLastMonth(range);
  report(
    prev.from === '2026-10-01' && prev.to === '2026-10-07' && changePercent(110n, 100n) === 10,
    'So với cùng các ngày của tháng trước: 01–07/11 với 01–07/10',
  );
  const pr = previousRange({ from: '2026-11-02', to: '2026-11-08' });
  report(pr.from === '2026-10-26' && pr.to === '2026-11-01', 'Khoảng liền trước cùng độ dài');
  report(
    sameDaysLastMonth({ from: '2026-03-31', to: '2026-03-31' }).to === '2026-02-28',
    'Ngày 31/03 so với 28/02, không tràn sang tháng sau',
  );
  const commissionSum = byStaff(input, range).reduce((m, r) => m + r.commissionVnd, 0n);
  const posted = salon.money.commission
    .filter((c) => c.at >= at('2026-11-01', '00:00') && c.at < at('2026-11-08', '00:00'))
    .reduce((m, c) => m + c.amountVnd, 0n);
  report(commissionSum === posted, 'Hoa hồng tạm tính theo nhân viên bằng tổng các khoản đã ghi');
}

// ---- BR-47: occupancy and no-shows ----

{
  const base = salon.appointments.find((a) => a.status === 'completed')!;
  const date = '2026-11-04';
  const seg = (kind: 'prep' | 'work' | 'wait', resourceId: string, from: string, to: string) => ({
    resourceId,
    startAt: at(date, from),
    endAt: at(date, to),
    kind,
    itemIndex: 0,
  });
  const appt: Appointment = {
    ...base,
    id: 'occ-1',
    startAt: at(date, '10:00'),
    status: 'completed',
    bookings: [
      seg('prep', 'may-hung', '09:45', '10:00'),
      seg('work', 'may-hung', '10:00', '10:40'),
      seg('wait', 'may-chair-1', '10:40', '11:25'),
      seg('work', 'may-hung', '11:25', '11:45'),
    ],
  };
  const input = inputOf(emptyMoney, { appointments: [appt] });
  report(
    busyMinutes(input, 'may-hung', date) === 75,
    'BR-47: 15 phút chuẩn bị + 40 + 20 phút làm = 75 phút bận; 45 phút chờ không tính',
    String(busyMinutes(input, 'may-hung', date)),
  );
  const cancelled = inputOf(emptyMoney, { appointments: [{ ...appt, status: 'cancelled' }] });
  report(busyMinutes(cancelled, 'may-hung', date) === 0, 'BR-47: lịch đã hủy không tính');

  const full = shiftMinutes(input, 'may-hung', date);
  const leave: StaffTimeOff = {
    id: 'l1',
    resourceId: 'may-hung',
    date,
    from: '09:00',
    to: '11:00',
    reason: 'x',
    status: 'approved',
    sentAt: at('2026-11-01', '08:00'),
  };
  const off = inputOf(emptyMoney, { timeOff: [leave] });
  const pending = inputOf(emptyMoney, { timeOff: [{ ...leave, status: 'pending' }] });
  report(
    full > 120 &&
      shiftMinutes(off, 'may-hung', date) === full - 120 &&
      shiftMinutes(pending, 'may-hung', date) === full,
    'BR-47: phút trong ca trừ nghỉ phép đã duyệt (2 giờ), đơn chưa duyệt chưa trừ',
  );
  const occ = occupancy(input, { from: date, to: date }, ['may-hung']);
  report(
    occ.percent === Math.round((75 / full) * 100),
    'BR-47: lấp đầy = phút bận ÷ phút trong ca',
    show(occ),
  );
  const closed = '2026-11-09';
  report(
    occupancy(input, { from: closed, to: closed }).percent === null,
    'BR-47: ngày đóng cửa không có ca nên không có tỉ lệ',
  );

  const mk = (
    id: string,
    status: Appointment['status'],
    start: string,
    deposit?: bigint,
  ): Appointment => ({
    ...base,
    id,
    status,
    startAt: at('2026-11-03', start),
    ...(deposit ? { depositVnd: deposit } : {}),
    items: [{ ...base.items[0]!, priceVnd: 150_000n }],
  });
  const ns = noShows(
    inputOf(emptyMoney, {
      appointments: [
        mk('n1', 'completed', '09:00'),
        mk('n2', 'completed', '10:00'),
        mk('n3', 'no_show', '11:00', 100_000n),
        mk('n4', 'cancelled', '12:00'),
        { ...mk('n5', 'confirmed', '13:00'), startAt: '2026-11-20T03:00:00Z' },
      ],
    }),
    { from: '2026-11-01', to: '2026-11-30' },
  );
  report(
    ns.noShow === 1 &&
      ns.due === 3 &&
      ns.rateTenths === 333 &&
      ns.lostVnd === 150_000n &&
      ns.depositKeptVnd === 100_000n,
    'BR-47: không đến = 1 / 3 lịch đã tới giờ (hủy và chưa tới không tính), mất 150.000 ₫, giữ 100.000 ₫ cọc',
    show(ns),
  );
}

// ---- Tổng quan: the work waiting ----

{
  const nameOf = (id: string) => salon.resources.find((r) => r.id === id)?.name ?? id;
  const args = {
    leaves: salon.staffTimeOff,
    requeues: [],
    money: salon.money,
    appointments: salon.appointments,
    nameOf,
    today: MOCK_TODAY,
    showCommission: true,
  };
  const all = todoItems(args);
  report(
    all.some((i) => i.title === 'Kỳ hoa hồng 10/2026 chưa chốt' && i.href === 'commission'),
    'BR-42: Tổng quan có dòng "Kỳ hoa hồng 10/2026 chưa chốt" dẫn tới Hoa hồng',
    all.map((i) => i.title).join(' | '),
  );
  report(
    !todoItems({ ...args, showCommission: false }).some((i) => i.id.startsWith('period-')),
    'BR-42: quản lý không thấy dòng nhắc chốt kỳ, chỉ chủ cơ sở',
  );
  const actor = { name: 'Chính Nguyễn', role: 'Chủ cơ sở' };
  const closed = closePeriod(salon.money, '2026-10', { now: MOCK_NOW, actor });
  report(
    !todoItems({ ...args, money: closed.money }).some((i) => i.id === 'period-2026-10'),
    'Chốt kỳ 10/2026 xong thì dòng nhắc mất',
  );
  const pendingLeave = salon.staffTimeOff.find((l) => l.status === 'pending');
  if (pendingLeave) {
    const mine = (list: typeof all) => list.filter((i) => i.id === 'leave-' + pendingLeave.id);
    const after = todoItems({
      ...args,
      leaves: salon.staffTimeOff.map((l) =>
        l.id === pendingLeave.id ? { ...l, status: 'approved' as const } : l,
      ),
    });
    report(
      mine(all).length === 1 && mine(after).length === 0,
      'Duyệt đơn nghỉ thì dòng của đơn đó mất khỏi Việc cần xử lý',
    );
  }
  const refund = all.find((i) => i.id === 'refund-rf-0184');
  report(
    refund?.title === 'Hoàn 80.000 ₫ cho Chị Diệu' && refund.href === 'refunds',
    'Yêu cầu hoàn đang chờ duyệt có dòng riêng dẫn tới Hoàn tiền',
    refund?.title,
  );
  const withRequeue = todoItems({
    ...args,
    requeues: [
      {
        id: 'rq',
        resourceId: 'may-hung',
        date: '2026-11-06',
        reason: 'Còn làm 10:00–15:00',
        createdAt: MOCK_NOW,
        appointmentIds: ['a', 'b'],
        handling: {},
      },
    ],
  });
  report(
    withRequeue.some((i) => i.title === '2 lịch cần xếp lại' && i.href === 'time-off/rq'),
    'Lịch cần xếp lại có dòng dẫn tới nơi xử lý của nó',
  );
}

console.log(failures === 0 ? '\nTất cả đạt.' : `\n${failures} lỗi.`);
process.exit(failures === 0 ? 0 : 1);
