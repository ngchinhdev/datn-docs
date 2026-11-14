/*
 * Checks the platform administration (mock/platform.ts, BR-75, BR-83, BR-84, BR-89 to BR-91) and
 * the sample tenants it reads.
 * Run: pnpm check:platform   (Node 24 runs TypeScript directly)
 */
import { members, workspaces } from '../mock/fixtures/accounts.ts';
import {
  PLATFORM_ADMIN,
  SEED_LOCKS,
  SEED_LOG,
  platformTenants,
  type PlatformTenant,
} from '../mock/fixtures/platform.ts';
import { industryTemplates } from '../mock/fixtures/templates.ts';
import {
  EXTEND_MAX_DAYS,
  addPlatformLog,
  catalogOf,
  draftErrors,
  draftOf,
  extended,
  extension,
  extensionDaysError,
  extensionDetail,
  filterTenants,
  lockReasonError,
  lockedNote,
  overview,
  paginate,
  planChanges,
  planImpacts,
  planUsage,
  priceRows,
  pricingNote,
  tenantView,
  unlockReasonError,
  type TenantFilter,
  type TenantView,
} from '../mock/platform.ts';
import { formatVnd } from '../mock/format.ts';
import {
  DEFAULT_CATALOG,
  DEFAULT_PERIOD_END,
  entitlements,
  periodEnd,
} from '../mock/subscription.ts';
import { addDays, MOCK_NOW, MOCK_TODAY } from '../mock/time.ts';

let failures = 0;
const report = (ok: boolean, name: string, detail = '') => {
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` :: ${detail}` : ''}`);
};

const tenant = (id: string): PlatformTenant => {
  const found = platformTenants.find((t) => t.id === id);
  if (!found) throw new Error(`no tenant ${id}`);
  return found;
};
const viewsAt = (now: string, locks: typeof SEED_LOCKS = SEED_LOCKS): TenantView[] =>
  platformTenants.map((t) => tenantView(t, t.subscription, locks[t.id] ?? null, now));
const views = viewsAt(MOCK_NOW);
const viewOf = (id: string) => views.find((v) => v.tenant.id === id)!;
const none: TenantFilter = { q: '', state: '', plan: '', industry: '', lockedOnly: false };
const names = (list: TenantView[]) => list.map((v) => v.tenant.name);

// ---- The sample tenants ----

report(
  platformTenants.length === 23 &&
    new Set(platformTenants.map((t) => t.id)).size === 23 &&
    new Set(platformTenants.map((t) => t.slug)).size === 23,
  'BR-89: 23 cơ sở, mã và địa chỉ trang không trùng',
);
report(
  workspaces.every((w) => {
    const t = platformTenants.find((p) => p.id === w.id);
    return t?.slug === w.slug && t.name === w.name;
  }),
  'BR-89: bốn cơ sở của tài khoản mẫu khớp tên, địa chỉ trang và mã với dữ liệu nền tảng',
);
report(
  tenant('may').subscription.periodEndsOn === DEFAULT_PERIOD_END &&
    tenant('pawpaw').subscription.periodEndsOn === DEFAULT_PERIOD_END &&
    tenant('may').subscription.planCode === 'pro' &&
    tenant('pawpaw').subscription.planCode === 'basic',
  'BR-83: Tóc Mây Chuyên nghiệp, Pawpaw Cơ bản, cùng hết 28/11/2026',
);
report(
  workspaces.every((w) => {
    const own = members.filter((m) => m.workspaceId === w.id);
    const t = tenant(w.id);
    // A tenant whose owner is not an account of the sample data has more members than listed.
    return (
      !w.built ||
      (own.length === t.totals.members &&
        own.filter((m) => m.staffResourceId).length === t.totals.takingBookings)
    );
  }),
  'BR-89: số thành viên và số người nhận khách của Tóc Mây, Pawpaw khớp danh sách thành viên',
);
{
  const bad = platformTenants.filter((t) => {
    const last = t.payments.find((p) => p.amountVnd > 0n && !p.label.startsWith('Nâng'));
    if (!last || !t.subscription.periodEndsOn) return false;
    return periodEnd(last.date, t.planMonths) !== t.subscription.periodEndsOn;
  });
  report(
    bad.length === 0,
    'BR-84: hạn của mỗi cơ sở trả phí là hết kỳ của lần thanh toán gần nhất',
    bad.map((t) => t.name).join(', '),
  );
}
report(
  platformTenants
    .filter((t) => t.subscription.periodEndsOn === null)
    .every(
      (t) =>
        t.payments.length === 0 &&
        t.totals.appointmentsMonth === 0 &&
        t.totals.upcoming === 0 &&
        t.subscription.trialEndsOn === addDays(t.createdOn, 6),
    ),
  'BR-80, BR-81: dùng thử 7 ngày tính cả ngày tạo, chưa có thanh toán và chưa có lịch hẹn',
);
{
  const created = (id: string, version: number) =>
    platformTenants.filter((t) => t.industry === id && t.templateVersion === version).length;
  report(
    industryTemplates.every(
      (tpl) =>
        tpl.publishedVersion === null ||
        created(tpl.id, tpl.publishedVersion.number) === tpl.publishedVersion.tenantsCreated,
    ),
    'BR-70: số cơ sở tạo từ bản đang xuất bản của mỗi ngành khớp trang Gói cấu hình ngành',
  );
}

// ---- BR-89: state of the plan, lock apart ----

const sevenDaysOn = viewsAt('2026-11-14T03:20:00Z');
report(
  viewOf('havy').state === 'expired' &&
    viewOf('havy').daysSince === 7 &&
    viewOf('barber-pho-co').state === 'trial' &&
    viewOf('barber-pho-co').daysLeft === 6 &&
    viewOf('may').state === 'active' &&
    viewOf('may').daysLeft === 22,
  'BR-89: Hạ Vy hết hạn 7 ngày, Barber Phố Cổ dùng thử còn 6 ngày, Tóc Mây còn 22 ngày',
);
report(
  viewOf('xinh').lock !== null &&
    viewOf('xinh').state === 'active' &&
    viewOf('xinh').endsOn === '2026-12-15' &&
    viewOf('xinh').daysLeft === 39,
  'BR-89: Nail Xinh 247 bị khóa vẫn là "Đang dùng", còn 39 ngày: khóa là cờ riêng, không phải trạng thái gói',
);
report(
  sevenDaysOn.find((v) => v.tenant.id === 'spa-meo-u')?.state === 'expired' &&
    sevenDaysOn.find((v) => v.tenant.id === 'may')?.state === 'active',
  'BR-80: sau 23:59 ngày 08/11 Spa Mèo Ú hết dùng thử, đồng hồ quyết định chứ không có job đổi trạng thái',
);

// ---- BR-91: extending by hand ----

const havy = tenant('havy').subscription;
const mayPlan = tenant('may').subscription;
const barber = tenant('barber-pho-co').subscription;
report(
  extension(havy, 7, MOCK_NOW).newEnd === '2026-11-13' &&
    extension(havy, 7, MOCK_NOW).mode === 'expired' &&
    extended(havy, extension(havy, 7, MOCK_NOW)).planCode === 'basic',
  'BR-91: Nail Hạ Vy hết hạn 31/10, gia hạn 7 ngày vào 07/11 thì hạn mới 13/11 (hôm nay là ngày thứ nhất), giữ gói Cơ bản',
);
report(
  extension(mayPlan, 7, MOCK_NOW).newEnd === '2026-12-05' &&
    extension(mayPlan, 7, MOCK_NOW).oldEnd === '2026-11-28',
  'BR-91: cơ sở còn hạn đến 28/11 gia hạn 7 ngày thành 05/12 (nối vào hạn cũ)',
);
{
  const e = extension(barber, 7, MOCK_NOW);
  const after = extended(barber, e);
  report(
    e.field === 'trial' &&
      after.trialEndsOn === '2026-11-19' &&
      after.periodEndsOn === null &&
      after.planCode === barber.planCode,
    'BR-91: đang dùng thử thì kéo dài dùng thử, không biến thành kỳ đã trả',
  );
}
{
  const meoU = tenant('spa-meo-u').subscription;
  const late = '2026-11-12T03:20:00Z';
  const e = extension(meoU, 7, late);
  report(
    e.mode === 'expired' && e.field === 'trial' && e.newEnd === '2026-11-18',
    'BR-91: dùng thử đã hết thì tính từ hôm nay và vẫn là dùng thử',
  );
}
report(
  extensionDaysError(90) === null &&
    extensionDaysError(1) === null &&
    extensionDaysError(EXTEND_MAX_DAYS + 1) !== null &&
    extensionDaysError(0) !== null &&
    extensionDaysError(2.5) !== null &&
    extensionDaysError(null) !== null,
  'BR-91: 91 ngày bị từ chối, 90 ngày được; 0, số lẻ và ô trống bị từ chối',
);
report(
  extensionDetail(7, extension(havy, 7, MOCK_NOW)) === '7 ngày: hạn 31/10 → 13/11',
  'BR-75: dòng nhật ký của một lần gia hạn nêu số ngày, hạn cũ và hạn mới',
);

// ---- BR-90: lock and unlock ----

const REASON_19 = 'a'.repeat(19);
const REASON_20 = 'a'.repeat(20);
report(
  lockReasonError(REASON_19) !== null &&
    lockReasonError(REASON_20) === null &&
    lockReasonError(`   ${REASON_19}   `) !== null &&
    lockReasonError('') !== null,
  'BR-90: lý do khóa 19 ký tự bị từ chối, 20 ký tự thì được; khoảng trắng hai đầu không tính',
);
report(
  unlockReasonError('') !== null &&
    unlockReasonError('   ') !== null &&
    unlockReasonError('Đã gỡ nội dung vi phạm') === null,
  'BR-90: mở khóa cũng phải có lý do',
);
{
  const locked = tenantView(
    tenant('may'),
    tenant('may').subscription,
    { at: MOCK_NOW, reason: REASON_20 },
    MOCK_NOW,
  );
  const open = viewOf('may');
  report(
    locked.endsOn === open.endsOn &&
      locked.daysLeft === open.daysLeft &&
      locked.state === open.state,
    'BR-90: khóa không đổi hạn của gói và không cộng bù ngày',
  );
  const log = addPlatformLog(SEED_LOG, MOCK_NOW, PLATFORM_ADMIN, {
    action: 'Khóa cơ sở',
    object: 'Salon Tóc Mây',
    detail: 'Gói vẫn chạy đến 28/11/2026',
    tenantId: 'may',
    reason: REASON_20,
  });
  report(
    log.length === SEED_LOG.length + 1 &&
      SEED_LOG.every((entry, i) => log[i] === entry) &&
      log.at(-1)?.reason === REASON_20 &&
      log.at(-1)?.tenantId === 'may',
    'BR-63: nhật ký nền tảng chỉ thêm một dòng ở cuối, các dòng cũ giữ nguyên',
  );
}

// ---- BR-84: prices by period ----

{
  const draft = draftOf(DEFAULT_CATALOG);
  draft.plans.basic.price = '219.000';
  const next = catalogOf(draft, DEFAULT_CATALOG);
  const rows = priceRows(next);
  const row = (months: number) => rows.find((r) => r.months === months)!;
  report(
    formatVnd(row(1).prices.basic) === '219.000 ₫' &&
      formatVnd(row(3).prices.basic) === '591.000 ₫' &&
      formatVnd(row(12).prices.basic) === '2.102.000 ₫',
    'BR-84: giá Cơ bản 219.000 ₫ thì 3 tháng 591.000 ₫ và 12 tháng 2.102.000 ₫ (giảm 10% và 20%, làm tròn tới nghìn)',
  );
  const old = priceRows(DEFAULT_CATALOG);
  report(
    formatVnd(old[1]!.prices.basic) === '537.000 ₫' &&
      formatVnd(old[2]!.prices.basic) === '1.910.000 ₫' &&
      formatVnd(old[1]!.prices.pro) === '1.077.000 ₫' &&
      formatVnd(old[2]!.prices.pro) === '3.830.000 ₫',
    'BR-84: giá đang áp của hai gói là 537.000 ₫, 1.910.000 ₫, 1.077.000 ₫ và 3.830.000 ₫',
  );
  report(
    draftErrors(draftOf(DEFAULT_CATALOG)).any === false &&
      draftErrors({ ...draft, discounts: { 3: '100', 12: '20' } }).discounts[3] !== undefined &&
      draftErrors({ ...draft, plans: { ...draft.plans, pro: { ...draft.plans.pro, price: '' } } })
        .plans.pro.price !== undefined &&
      draftErrors({
        ...draft,
        plans: { ...draft.plans, basic: { ...draft.plans.basic, branches: '0' } },
      }).plans.basic.branches !== undefined,
    'BR-83: giá trống, giảm 100% hoặc 0 chi nhánh không lưu được',
  );
  report(
    planChanges(DEFAULT_CATALOG, next).join('; ') === 'giá tháng Cơ bản 199.000 ₫ → 219.000 ₫' &&
      planImpacts(DEFAULT_CATALOG, next, views).length === 0,
    'BR-83: đổi giá không cần xác nhận, thanh "Chưa lưu" nêu đúng thay đổi',
  );
  const note = pricingNote(DEFAULT_CATALOG, next, views);
  report(
    note !== null && note.includes('9 cơ sở đang trả gói Cơ bản giữ giá cũ'),
    'BR-83: đổi giá chỉ áp cho lần thanh toán sau; 9 cơ sở đang trả gói Cơ bản giữ giá cũ',
    note ?? '',
  );
  report(
    pricingNote(DEFAULT_CATALOG, DEFAULT_CATALOG, views) === null,
    'BR-83: không đổi giá thì không có dòng về giá',
  );
}

// ---- BR-83: what a change takes away ----

{
  const off = draftOf(DEFAULT_CATALOG);
  off.plans.pro.chatbot = false;
  const next = catalogOf(off, DEFAULT_CATALOG);
  const impacts = planImpacts(DEFAULT_CATALOG, next, views);
  report(
    impacts.length === 1 &&
      impacts[0]?.planCode === 'pro' &&
      impacts[0].kind === 'feature' &&
      impacts[0].label === 'Chatbot đặt lịch' &&
      impacts[0].tenants === 11,
    'BR-83: tắt Chatbot của gói Chuyên nghiệp cần xác nhận và báo 11 cơ sở (6 trả phí và 5 dùng thử)',
    JSON.stringify(impacts),
  );
  const usage = planUsage(views, 'pro');
  report(
    usage.paid === 6 && usage.trial === 5 && planUsage(views, 'basic').paid === 9,
    'BR-83: 9 cơ sở trả phí gói Cơ bản; gói Chuyên nghiệp có 6 trả phí và 5 dùng thử',
  );
  const lost = entitlements(tenant('may').subscription, MOCK_NOW, next);
  const kept = entitlements(tenant('may').subscription, MOCK_NOW, DEFAULT_CATALOG);
  report(
    !lost.features.includes('chatbot') && kept.features.includes('chatbot'),
    'BR-87: sau khi lưu, cơ sở của gói đó mất tính năng đã tắt',
  );

  const on = draftOf(DEFAULT_CATALOG);
  on.plans.basic.chatbot = true;
  const turnedOn = catalogOf(on, DEFAULT_CATALOG);
  report(
    planImpacts(DEFAULT_CATALOG, turnedOn, views).length === 0 &&
      planChanges(DEFAULT_CATALOG, turnedOn).join('; ') === 'bật Chatbot đặt lịch ở gói Cơ bản',
    'BR-83: bật thêm tính năng có hiệu lực ngay, không cần xác nhận',
  );

  const fewer = draftOf(DEFAULT_CATALOG);
  fewer.plans.pro.unlimited = false;
  fewer.plans.pro.branches = '2';
  const capped = catalogOf(fewer, DEFAULT_CATALOG);
  const branch = planImpacts(DEFAULT_CATALOG, capped, views);
  report(
    branch.length === 1 &&
      branch[0]?.kind === 'branches' &&
      branch[0].tenants === 1 &&
      capped.plans.pro.features.includes('multi_branch'),
    'BR-83: giảm chi nhánh tối đa của Chuyên nghiệp xuống 2 cần xác nhận và báo 1 cơ sở đang có 3 chi nhánh',
    JSON.stringify(branch),
  );
  const one = draftOf(DEFAULT_CATALOG);
  one.plans.pro.unlimited = false;
  one.plans.pro.branches = '1';
  report(
    !catalogOf(one, DEFAULT_CATALOG).plans.pro.features.includes('multi_branch'),
    'BR-83: gói chỉ còn 1 chi nhánh thì không còn tính năng nhiều chi nhánh',
  );
}

// ---- MH-60: the overview adds up to the list ----

const allPayments = platformTenants.flatMap((t) => t.payments);
const ov = overview(views, allPayments, MOCK_NOW);
report(
  ov.total === 23 &&
    ov.paid === 15 &&
    ov.trial === 5 &&
    ov.expired === 3 &&
    ov.paid + ov.trial + ov.expired === ov.total &&
    ov.paidByPlan.basic === 9 &&
    ov.paidByPlan.pro === 6,
  'BR-89: tổng quan 23 cơ sở = 15 trả phí (9 Cơ bản, 6 Chuyên nghiệp) + 5 dùng thử + 3 hết hạn',
  `${ov.total} = ${ov.paid} + ${ov.trial} + ${ov.expired}`,
);
report(
  ov.industriesTotal.tenants === filterTenants(views, none).length &&
    ov.industries.reduce((s, r) => s + r.tenants, 0) === 23 &&
    ov.industriesTotal.appointmentsMonth ===
      platformTenants.reduce((s, t) => s + t.totals.appointmentsMonth, 0) &&
    ov.industries.every((r) => r.paid + r.trial + r.expired === r.tenants),
  'BR-89: bảng cơ sở theo ngành cộng khớp với danh sách 23 cơ sở',
);
report(
  ov.createdSince === 6 &&
    ov.since === '2026-11-01' &&
    ov.trialEndingSoon === 1 &&
    names(ov.newest).length === 5 &&
    ov.newest.every((v, i, all) => i === 0 || all[i - 1]!.tenant.createdOn >= v.tenant.createdOn),
  'BR-86: +6 cơ sở từ 01/11, 1 dùng thử hết trong 3 ngày tới, 5 cơ sở mới xếp mới nhất trước',
  `${ov.createdSince} ${ov.trialEndingSoon}`,
);
report(
  ov.locked.count === 1 && lockedNote(ov.locked) === 'Nail Xinh 247 · từ 06/11',
  'BR-75: tổng quan chỉ có Nail Xinh 247 bị khóa, từ 06/11',
  lockedNote(ov.locked),
);
{
  const spent = allPayments
    .filter((p) => p.date >= '2026-11-01' && p.date <= MOCK_TODAY && p.amountVnd > 0n)
    .reduce((s, p) => s + p.amountVnd, 0n);
  const nov = allPayments.filter((p) => p.date >= '2026-11-01' && p.date <= MOCK_TODAY);
  report(
    ov.revenue.amountVnd === spent &&
      ov.revenue.count === nov.filter((p) => p.amountVnd > 0n).length &&
      ov.revenue.count > 0,
    'BR-88: thu tháng 11 là tổng các lần thanh toán qua cổng từ 01/11 đến hôm nay',
    `${formatVnd(ov.revenue.amountVnd)} · ${ov.revenue.count} giao dịch`,
  );
  const lastMonth = overview(views, allPayments, '2026-11-30T16:59:00Z');
  report(
    lastMonth.revenue.amountVnd >= ov.revenue.amountVnd,
    'BR-89: tổng thu tính đến ngày của đồng hồ, không phải ngày thật',
  );
  report(
    !allPayments.some((p) => p.source === 'Quản trị' && p.amountVnd !== 0n),
    'BR-91: gia hạn thủ công không tạo khoản thu',
  );
}
report(
  ov.expiring.length > 0 &&
    ov.expiring[0]?.tenant.name === 'Spa Mèo Ú' &&
    names(ov.expiring).includes('Tóc Đẹp Thủ Đức') &&
    names(ov.expiring).includes('Nail Hạ Vy'),
  'BR-86: "Sắp hết hạn, đã hết hạn" có Spa Mèo Ú (còn 2 ngày), Tóc Đẹp Thủ Đức (còn 3 ngày) và Nail Hạ Vy',
  names(ov.expiring).join(', '),
);

// ---- MH-58: the list ----

report(
  names(filterTenants(views, { ...none, lockedOnly: true })).join('|') === 'Nail Xinh 247',
  'BR-75: lọc "Bị khóa" chỉ còn Nail Xinh 247',
);
report(
  names(filterTenants(views, { ...none, q: 'tocmay' })).join('|') === 'Salon Tóc Mây' &&
    names(filterTenants(views, { ...none, q: 'TOC MAY' })).includes('Salon Tóc Mây') &&
    names(filterTenants(views, { ...none, q: 'ha.le@pawpaw' })).join('|') ===
      'Spa thú cưng Pawpaw' &&
    names(filterTenants(views, { ...none, q: 'toc-xinh-gv' })).join('|') === 'Tóc Xinh Gò Vấp' &&
    filterTenants(views, { ...none, q: 'không có cơ sở này' }).length === 0,
  'BR-89: tìm theo tên (không dấu, không phân biệt hoa thường), địa chỉ trang và email chủ cơ sở',
);
report(
  filterTenants(views, { ...none, state: 'expired' }).length === 3 &&
    filterTenants(views, { ...none, state: 'trial' }).length === 5 &&
    filterTenants(views, { ...none, plan: 'basic' }).length === 12 &&
    filterTenants(views, { ...none, plan: 'pro' }).length === 11 &&
    filterTenants(views, { ...none, industry: 'pet_spa' }).length === 7 &&
    filterTenants(views, { ...none, industry: 'pet_spa', state: 'expired' }).length === 1,
  'BR-89: lọc theo trạng thái, gói và ngành',
);
{
  const all = filterTenants(views, none);
  const page1 = paginate(all, 1, 9);
  const page3 = paginate(all, 3, 9);
  const beyond = paginate(all, 9, 9);
  report(
    page1.rows.length === 9 &&
      page1.from === 1 &&
      page1.to === 9 &&
      page1.pages === 3 &&
      page3.rows.length === 5 &&
      page3.to === 23 &&
      beyond.page === 3 &&
      paginate([], 1, 9).from === 0,
    'BR-89: 23 cơ sở chia 3 trang, "Hiển thị 1–9 trong 23 cơ sở"; trang quá số trang thì về trang cuối',
  );
}

// ---- The total of a tenant is the only thing the platform reads (BR-89) ----

report(
  platformTenants.every((t) => {
    const keys = Object.keys(t.totals).sort().join(',');
    return (
      keys ===
      'afterExpiry,appointments30,appointmentsMonth,branches,customers,members,takingBookings,upcoming'
    );
  }),
  'BR-89: mỗi cơ sở chỉ có số tổng (chi nhánh, thành viên, lịch hẹn, khách đã lưu), không có dòng dữ liệu nào',
);

// ---- The seed ----

{
  const upgrade = tenant('toc-moc-q10').payments.find((p) => p.label.startsWith('Nâng'));
  report(
    upgrade?.amountVnd === 134_000n && tenant('toc-moc-q10').subscription.planCode === 'pro',
    'BR-85: Tóc Mộc Quận 10 nâng gói khi còn 20 ngày trả (399.000 − 199.000) × 20 / 30 làm tròn lên 134.000 ₫',
    upgrade ? formatVnd(upgrade.amountVnd) : 'không có',
  );
  const may = tenant('may').payments;
  report(
    may.length === 4 &&
      may.some(
        (p) =>
          p.label === 'Gia hạn thủ công 7 ngày' && p.amountVnd === 0n && p.source === 'Quản trị',
      ) &&
      may.filter((p) => p.amountVnd > 0n).every((p) => p.amountVnd === 399_000n),
    'BR-91: lịch sử của Tóc Mây có bốn dòng, lần gia hạn thủ công 22/09 không thu tiền',
  );
}

console.log(failures === 0 ? '\nTất cả đạt.' : `\n${failures} lỗi.`);
process.exit(failures === 0 ? 0 : 1);
