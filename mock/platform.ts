/*
 * The platform administration (BR-75, BR-83, BR-84, BR-89 to BR-91): the state of each tenant's plan,
 * the numbers of the overview, the list, locking and unlocking, extending by hand, and what saving the
 * plans changes. Plain functions; `now` is always an argument, money is integer VND (`bigint`). Nothing
 * here touches React.
 */
import { formatVnd } from './format.ts';
import type {
  IndustryId,
  PlatformLogEntry,
  PlatformPayment,
  PlatformTenant,
} from './fixtures/platform.ts';
import {
  PERIOD_MONTHS,
  PLAN_CODES,
  daysLeft,
  periodPrice,
  planMode,
  type Catalog,
  type FeatureCode,
  type PlanCode,
  type Subscription,
} from './subscription.ts';
import { addDays, formatDateTime, localDate } from './time.ts';

export const INDUSTRY_LABEL: Record<IndustryId, string> = {
  hair_salon: 'Salon tóc',
  pet_spa: 'Spa thú cưng',
};

export const INDUSTRY_IDS = Object.keys(INDUSTRY_LABEL) as IndustryId[];

export type PlatformState = 'trial' | 'active' | 'expired';

/** Trial and paid plans that end within this many days are about to run out (BR-86). */
export const SOON_DAYS = 3;

const shortDate = (date: string) => `${date.slice(8, 10)}/${date.slice(5, 7)}`;
const fullDate = (date: string) => `${shortDate(date)}/${date.slice(0, 4)}`;

/** A lower-case copy with no accents, for searching. */
export const fold = (text: string) =>
  text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

// ---------------------------------------------------------------------------------------------
// One tenant as the platform sees it

export interface TenantLock {
  /** ISO 8601, UTC. */
  at: string;
  reason: string;
}

export interface TenantView {
  tenant: PlatformTenant;
  subscription: Subscription;
  /** Where the plan stands; a lock is not a state (BR-89). */
  state: PlatformState;
  /** Last day of the trial or of the paid period; `null` when it never ran. */
  endsOn: string | null;
  /** Days left counting today, while the plan runs. */
  daysLeft: number | null;
  /** Days since the plan ended, once it has. */
  daysSince: number | null;
  lock: TenantLock | null;
}

export function tenantView(
  tenant: PlatformTenant,
  subscription: Subscription,
  lock: TenantLock | null,
  now: string,
): TenantView {
  const state = planMode(subscription, now);
  const endsOn = subscription.periodEndsOn ?? subscription.trialEndsOn;
  const today = localDate(now);
  const running = state !== 'expired' && endsOn !== null;
  return {
    tenant,
    subscription,
    state,
    endsOn,
    daysLeft: running ? daysLeft(endsOn, today) : null,
    daysSince:
      !running && endsOn !== null
        ? Math.round(
            (Date.parse(`${today}T00:00:00Z`) - Date.parse(`${endsOn}T00:00:00Z`)) / 86_400_000,
          )
        : null,
    lock,
  };
}

/** `Dùng thử · còn 6 ngày`, `Đang dùng`, `Hết hạn`. */
export const stateLabel = (view: TenantView) =>
  view.state === 'trial'
    ? `Dùng thử · còn ${view.daysLeft} ngày`
    : view.state === 'active'
      ? 'Đang dùng'
      : 'Hết hạn';

/** The badge of the Sapio design system for each state. */
export const STATE_BADGE: Record<PlatformState, string> = {
  trial: 'sp-badge--confirmed',
  active: 'sp-badge--checked-in',
  expired: 'sp-badge--no-show',
};

// ---------------------------------------------------------------------------------------------
// Overview (MH-60)

export interface IndustryRow {
  industry: IndustryId;
  tenants: number;
  paid: number;
  trial: number;
  expired: number;
  appointmentsMonth: number;
}

export interface Overview {
  total: number;
  /** First day of the month of `now`: the new tenants count from there. */
  since: string;
  createdSince: number;
  paid: number;
  paidByPlan: Record<PlanCode, number>;
  trial: number;
  trialEndingSoon: number;
  expired: number;
  locked: { count: number; first: TenantView | null };
  revenue: { amountVnd: bigint; count: number; month: number; upTo: string };
  industries: IndustryRow[];
  industriesTotal: Omit<IndustryRow, 'industry'>;
  newest: TenantView[];
  expiring: TenantView[];
}

/** Five tenants on the "Cơ sở mới" card, six on "Sắp hết hạn, đã hết hạn". */
const NEWEST_SHOWN = 5;
const EXPIRING_SHOWN = 6;

const byNewest = (a: TenantView, b: TenantView) =>
  b.tenant.createdOn.localeCompare(a.tenant.createdOn) ||
  a.tenant.name.localeCompare(b.tenant.name, 'vi');

export function overview(views: TenantView[], payments: PlatformPayment[], now: string): Overview {
  const today = localDate(now);
  const since = `${today.slice(0, 8)}01`;
  const count = (fn: (v: TenantView) => boolean) => views.filter(fn).length;

  const paidByPlan = Object.fromEntries(
    PLAN_CODES.map((code) => [
      code,
      count((v) => v.state === 'active' && v.subscription.planCode === code),
    ]),
  ) as Record<PlanCode, number>;

  // The month so far: gateway payments dated this month, up to today. A manual extension takes no money (BR-91).
  const month = payments.filter((p) => p.amountVnd > 0n && p.date >= since && p.date <= today);

  const industries = INDUSTRY_IDS.map((industry): IndustryRow => {
    const own = views.filter((v) => v.tenant.industry === industry);
    return {
      industry,
      tenants: own.length,
      paid: own.filter((v) => v.state === 'active').length,
      trial: own.filter((v) => v.state === 'trial').length,
      expired: own.filter((v) => v.state === 'expired').length,
      appointmentsMonth: own.reduce((sum, v) => sum + v.tenant.totals.appointmentsMonth, 0),
    };
  });

  const soon = views
    .filter((v) => v.state !== 'expired' && v.daysLeft !== null && v.daysLeft <= SOON_DAYS)
    .sort(
      (a, b) =>
        (a.daysLeft ?? 0) - (b.daysLeft ?? 0) || a.tenant.name.localeCompare(b.tenant.name, 'vi'),
    );
  const lapsed = views
    .filter((v) => v.state === 'expired')
    .sort((a, b) => (b.endsOn ?? '').localeCompare(a.endsOn ?? ''));

  const locked = views
    .filter((v) => v.lock)
    .sort((a, b) => (a.lock?.at ?? '').localeCompare(b.lock?.at ?? ''));

  return {
    total: views.length,
    since,
    createdSince: count((v) => v.tenant.createdOn >= since),
    paid: count((v) => v.state === 'active'),
    paidByPlan,
    trial: count((v) => v.state === 'trial'),
    trialEndingSoon: count((v) => v.state === 'trial' && (v.daysLeft ?? 0) <= SOON_DAYS),
    expired: count((v) => v.state === 'expired'),
    locked: { count: locked.length, first: locked[0] ?? null },
    revenue: {
      amountVnd: month.reduce((sum, p) => sum + p.amountVnd, 0n),
      count: month.length,
      month: Number(today.slice(5, 7)),
      upTo: today,
    },
    industries,
    industriesTotal: {
      tenants: views.length,
      paid: industries.reduce((s, r) => s + r.paid, 0),
      trial: industries.reduce((s, r) => s + r.trial, 0),
      expired: industries.reduce((s, r) => s + r.expired, 0),
      appointmentsMonth: industries.reduce((s, r) => s + r.appointmentsMonth, 0),
    },
    newest: [...views].sort(byNewest).slice(0, NEWEST_SHOWN),
    expiring: [...soon, ...lapsed].slice(0, EXPIRING_SHOWN),
  };
}

/** Reminders the owner got before the plan ends: 3 days before, 1 day before (BR-86). */
const remindersSent = (days: number) => (days <= 3 ? 1 : 0) + (days <= 1 ? 1 : 0);

/** The line under the name on "Sắp hết hạn, đã hết hạn". */
export function expiryNote(view: TenantView, catalog: Catalog): string {
  const end = view.endsOn ? shortDate(view.endsOn) : '';
  const plan = catalog.plans[view.subscription.planCode].name;
  if (view.subscription.periodEndsOn === null) {
    return view.state === 'trial'
      ? `Dùng thử hết 23:59 ngày ${end}, chưa kích hoạt`
      : `Dùng thử hết ${end}, chưa kích hoạt`;
  }
  if (view.state === 'expired') return `${plan} hết ${end}, chưa gia hạn`;
  const times = remindersSent(view.daysLeft ?? 0);
  return `${plan} hết ${end}, đã nhắc ${times} lần (BR-86)`;
}

/** The badge of an entry of that card: the days left, or "Hết hạn". */
export const expiryBadge = (view: TenantView) =>
  view.state === 'trial'
    ? { className: STATE_BADGE.trial, text: `Dùng thử · còn ${view.daysLeft} ngày` }
    : view.state === 'active'
      ? { className: 'sp-badge--pending', text: `Còn ${view.daysLeft} ngày` }
      : { className: STATE_BADGE.expired, text: 'Hết hạn' };

/** "Nail Xinh 247 · từ 06/11" under "Bị khóa". */
export function lockedNote(info: Overview['locked']): string {
  if (!info.first?.lock) return 'Không có cơ sở nào';
  if (info.count > 1)
    return `${info.count} cơ sở, sớm nhất từ ${shortDate(localDate(info.first.lock.at))}`;
  return `${info.first.tenant.name} · từ ${shortDate(localDate(info.first.lock.at))}`;
}

// ---------------------------------------------------------------------------------------------
// List (MH-58)

export interface TenantFilter {
  q: string;
  state: '' | PlatformState;
  plan: '' | PlanCode;
  industry: '' | IndustryId;
  lockedOnly: boolean;
}

/** Name, slug and the owner's email; the filters narrow it down (BR-89 keeps the rest out of reach). */
export function filterTenants(views: TenantView[], filter: TenantFilter): TenantView[] {
  const text = fold(filter.q.trim());
  return views
    .filter((v) => {
      if (filter.state && v.state !== filter.state) return false;
      if (filter.plan && v.subscription.planCode !== filter.plan) return false;
      if (filter.industry && v.tenant.industry !== filter.industry) return false;
      if (filter.lockedOnly && !v.lock) return false;
      if (!text) return true;
      const t = v.tenant;
      return fold(`${t.name} ${t.slug} ${t.ownerEmail}`).includes(text);
    })
    .sort(byNewest);
}

export interface Page<T> {
  rows: T[];
  page: number;
  pages: number;
  /** 1-based, `0` for an empty list. */
  from: number;
  to: number;
  total: number;
}

export function paginate<T>(list: T[], page: number, size: number): Page<T> {
  const pages = Math.max(1, Math.ceil(list.length / size));
  const current = Math.min(Math.max(1, Math.trunc(page) || 1), pages);
  const start = (current - 1) * size;
  const rows = list.slice(start, start + size);
  return {
    rows,
    page: current,
    pages,
    from: rows.length ? start + 1 : 0,
    to: start + rows.length,
    total: list.length,
  };
}

// ---------------------------------------------------------------------------------------------
// Locking and unlocking (BR-75, BR-90)

export const LOCK_REASON_MIN = 20;

const lengthOf = (text: string) => [...text.trim()].length;

/** The owner reads the reason and gets it by email, so it has to say something (BR-90). */
export function lockReasonError(reason: string): string | null {
  const length = lengthOf(reason);
  if (length === 0) return 'Nhập lý do khóa.';
  if (length < LOCK_REASON_MIN) {
    return `Lý do cần ít nhất ${LOCK_REASON_MIN} ký tự (đang có ${length}).`;
  }
  return null;
}

/** Only the admin reads it, but unlocking has to be explained too (BR-90). */
export function unlockReasonError(reason: string): string | null {
  return lengthOf(reason) === 0 ? 'Nhập lý do mở khóa.' : null;
}

// ---------------------------------------------------------------------------------------------
// Extending by hand (BR-91)

export const EXTEND_MAX_DAYS = 90;
export const EXTEND_PRESETS = [7, 14, 30] as const;

/** `null` when `days` is a whole number from 1 to 90. */
export function extensionDaysError(days: number | null): string | null {
  if (days === null || !Number.isFinite(days) || !Number.isInteger(days) || days < 1) {
    return 'Nhập số ngày từ 1 trở lên.';
  }
  if (days > EXTEND_MAX_DAYS) return `Tối đa ${EXTEND_MAX_DAYS} ngày mỗi lần.`;
  return null;
}

export interface Extension {
  /** Which date moves: a tenant that never paid keeps its trial going. */
  field: 'trial' | 'period';
  /** `null` when the tenant has no date yet. */
  oldEnd: string | null;
  newEnd: string;
  /** Where the plan stood when it was extended. */
  mode: PlatformState;
}

/**
 * BR-91: a plan that ran out counts from today (today is the first day); one that still runs adds
 * to its last day; a trial goes on as a trial. The plan stays the same and no money is booked.
 * `days` must have passed `extensionDaysError`.
 */
export function extension(sub: Subscription, days: number, now: string): Extension {
  const today = localDate(now);
  const field = sub.periodEndsOn ? 'period' : 'trial';
  const oldEnd = field === 'period' ? sub.periodEndsOn : sub.trialEndsOn;
  const mode = planMode(sub, now);
  const newEnd = mode === 'expired' || !oldEnd ? addDays(today, days - 1) : addDays(oldEnd, days);
  return { field, oldEnd, newEnd, mode };
}

export const extended = (sub: Subscription, e: Extension): Subscription =>
  e.field === 'period' ? { ...sub, periodEndsOn: e.newEnd } : { ...sub, trialEndsOn: e.newEnd };

/** The payment row an extension leaves in the history: no money (BR-91). */
export function extensionPayment(
  tenantId: string,
  days: number,
  now: string,
  seq: number,
): PlatformPayment {
  const today = localDate(now);
  return {
    id: `pay-${tenantId}-${today}-manual-${seq}`,
    date: today,
    label: `Gia hạn thủ công ${days} ngày`,
    amountVnd: 0n,
    source: 'Quản trị',
  };
}

// ---------------------------------------------------------------------------------------------
// The log of the platform (BR-63, BR-75)

export interface PlatformLogInput {
  action: string;
  object: string;
  detail: string;
  tenantId: string | null;
  reason?: string;
}

/** The list with one more line at the end; what is already there does not change. */
export function addPlatformLog(
  list: readonly PlatformLogEntry[],
  at: string,
  actor: { name: string; role: string },
  input: PlatformLogInput,
): PlatformLogEntry[] {
  return [
    ...list,
    {
      id: `pl-${list.length + 1}`,
      at,
      by: actor.name,
      role: actor.role,
      action: input.action,
      object: input.object,
      detail: input.detail,
      tenantId: input.tenantId,
      ...(input.reason ? { reason: input.reason } : {}),
    },
  ];
}

/** `7 ngày: hạn 21/09 → 28/09`. */
export const extensionDetail = (days: number, e: Extension) =>
  `${days} ngày: ${e.field === 'trial' ? 'hết dùng thử' : 'hạn'} ${e.oldEnd ? shortDate(e.oldEnd) : '—'} → ${shortDate(e.newEnd)}`;

/** The plan keeps running while the tenant is locked; the line says until when. */
export const lockDetail = (view: TenantView) =>
  view.endsOn ? `Gói vẫn chạy đến ${fullDate(view.endsOn)}` : 'Gói vẫn chạy';

export const logMoment = (entry: PlatformLogEntry) => formatDateTime(entry.at);

// ---------------------------------------------------------------------------------------------
// Plans and prices (MH-62, BR-83, BR-84)

/** What a plan form holds while it is being edited: text, because that is what a person types. */
export interface PlanDraft {
  name: string;
  /** Monthly price, as typed: `219.000`. */
  price: string;
  note: string;
  unlimited: boolean;
  /** Maximum branches, as typed; ignored while `unlimited`. */
  branches: string;
  packages: boolean;
  commission: boolean;
  chatbot: boolean;
}

export interface CatalogDraft {
  plans: Record<PlanCode, PlanDraft>;
  /** Percent off for 3 and 12 months, as typed. */
  discounts: { 3: string; 12: string };
}

const vnd = new Intl.NumberFormat('vi-VN');

/** The features that go together on the form: one switch each. */
export const FEATURE_SWITCHES = [
  { id: 'packages', label: 'Gói liệu trình, ví trả trước', features: ['packages_wallet'] },
  {
    id: 'commission',
    label: 'Hoa hồng nhân viên, báo cáo đầy đủ',
    features: ['commission', 'full_reports'],
  },
  { id: 'chatbot', label: 'Chatbot đặt lịch', features: ['chatbot'] },
] as const satisfies readonly { id: keyof PlanDraft; label: string; features: FeatureCode[] }[];

export type SwitchId = (typeof FEATURE_SWITCHES)[number]['id'];

export function draftOf(catalog: Catalog): CatalogDraft {
  const plans = Object.fromEntries(
    PLAN_CODES.map((code) => {
      const plan = catalog.plans[code];
      const max = plan.limits.branches;
      const draft: PlanDraft = {
        name: plan.name,
        price: vnd.format(plan.monthlyPriceVnd),
        note: plan.note,
        unlimited: max === null,
        branches: max === null ? '' : String(max),
        packages: plan.features.includes('packages_wallet'),
        commission: plan.features.includes('commission'),
        chatbot: plan.features.includes('chatbot'),
      };
      return [code, draft];
    }),
  ) as Record<PlanCode, PlanDraft>;
  const discount = (months: 3 | 12) =>
    String(catalog.periods.find((p) => p.months === months)?.discountPercent ?? 0);
  return { plans, discounts: { 3: discount(3), 12: discount(12) } };
}

const digits = (text: string) => text.replace(/\D/g, '');

/** `219.000` to `219000n`, or `null` when there is no number or it is zero. */
export function parsePrice(text: string): bigint | null {
  const d = digits(text);
  if (d === '' || d.length > 12) return null;
  const value = BigInt(d);
  return value > 0n ? value : null;
}

const parsePercent = (text: string): number | null => {
  if (!/^\d{1,3}$/.test(text.trim())) return null;
  const value = Number(text);
  return value <= 99 ? value : null;
};

export interface DraftErrors {
  plans: Record<PlanCode, { name?: string; price?: string; branches?: string }>;
  discounts: { 3?: string; 12?: string };
  /** At least one error: saving is off. */
  any: boolean;
}

export function draftErrors(draft: CatalogDraft): DraftErrors {
  const plans = {} as DraftErrors['plans'];
  let any = false;
  for (const code of PLAN_CODES) {
    const d = draft.plans[code];
    const errors: DraftErrors['plans'][PlanCode] = {};
    if (d.name.trim() === '') errors.name = 'Nhập tên gói.';
    if (parsePrice(d.price) === null) errors.price = 'Nhập giá tháng lớn hơn 0.';
    if (!d.unlimited && !/^[1-9]\d{0,2}$/.test(d.branches.trim())) {
      errors.branches = 'Nhập số chi nhánh từ 1, hoặc chọn Không giới hạn.';
    }
    if (Object.keys(errors).length > 0) any = true;
    plans[code] = errors;
  }
  const discounts: DraftErrors['discounts'] = {};
  for (const months of [3, 12] as const) {
    if (parsePercent(draft.discounts[months]) === null) {
      discounts[months] = 'Nhập số nguyên từ 0 đến 99.';
      any = true;
    }
  }
  return { plans, discounts, any };
}

/** The catalog a valid draft stands for. A plan with more than one branch has multi-branch (BR-83). */
export function catalogOf(draft: CatalogDraft, base: Catalog): Catalog {
  const plans = Object.fromEntries(
    PLAN_CODES.map((code) => {
      const d = draft.plans[code];
      const max = d.unlimited ? null : Number(d.branches.trim());
      const features: FeatureCode[] = [];
      if (max === null || max > 1) features.push('multi_branch');
      for (const sw of FEATURE_SWITCHES) {
        if (d[sw.id]) features.push(...sw.features);
      }
      return [
        code,
        {
          ...base.plans[code],
          name: d.name.trim(),
          monthlyPriceVnd: parsePrice(d.price) ?? base.plans[code].monthlyPriceVnd,
          note: d.note.trim(),
          features,
          limits: { branches: max },
        },
      ];
    }),
  ) as Catalog['plans'];
  return {
    plans,
    periods: base.periods.map((p) =>
      p.months === 1
        ? p
        : { ...p, discountPercent: parsePercent(draft.discounts[p.months]) ?? p.discountPercent },
    ),
  };
}

/** `Cơ bản` and `Chuyên nghiệp`: the table of prices by period, one row each. */
export interface PriceRow {
  months: number;
  discountPercent: number;
  prices: Record<PlanCode, bigint>;
}

export const priceRows = (catalog: Catalog): PriceRow[] =>
  PERIOD_MONTHS.map((months) => ({
    months,
    discountPercent: catalog.periods.find((p) => p.months === months)?.discountPercent ?? 0,
    prices: Object.fromEntries(
      PLAN_CODES.map((code) => [code, periodPrice(catalog.plans[code], months, catalog.periods)]),
    ) as Record<PlanCode, bigint>,
  }));

/** Tenants on a plan: those that pay for it, and (Professional only) those trying it (BR-81). */
export function planUsage(views: TenantView[], code: PlanCode) {
  return {
    paid: views.filter((v) => v.state === 'active' && v.subscription.planCode === code).length,
    trial: code === 'pro' ? views.filter((v) => v.state === 'trial').length : 0,
  };
}

/** Tenants that have the features of a plan today: they pay for it, or they are trying Professional. */
const holders = (views: TenantView[], code: PlanCode) =>
  views.filter(
    (v) =>
      (v.state === 'active' && v.subscription.planCode === code) ||
      (code === 'pro' && v.state === 'trial'),
  );

export interface PlanImpact {
  planCode: PlanCode;
  kind: 'feature' | 'branches';
  /** `Chatbot đặt lịch`, `Chi nhánh tối đa: không giới hạn → 2`. */
  label: string;
  /** Tenants that lose something. */
  tenants: number;
}

const limitText = (max: number | null) => (max === null ? 'không giới hạn' : String(max));

/**
 * BR-83: turning a feature off, or lowering the branch limit, takes something from tenants that
 * have it, so the admin is asked again with the number. Turning one on, or any price, is not asked.
 */
export function planImpacts(before: Catalog, after: Catalog, views: TenantView[]): PlanImpact[] {
  const impacts: PlanImpact[] = [];
  for (const code of PLAN_CODES) {
    const a = before.plans[code];
    const b = after.plans[code];
    const own = holders(views, code);
    for (const sw of FEATURE_SWITCHES) {
      const had = sw.features.some((f) => a.features.includes(f));
      const has = sw.features.some((f) => b.features.includes(f));
      if (had && !has) {
        impacts.push({ planCode: code, kind: 'feature', label: sw.label, tenants: own.length });
      }
    }
    const from = a.limits.branches;
    const to = b.limits.branches;
    const lower = to !== null && (from === null || to < from);
    if (lower) {
      impacts.push({
        planCode: code,
        kind: 'branches',
        label: `Chi nhánh tối đa: ${limitText(from)} → ${limitText(to)}`,
        tenants: own.filter((v) => v.tenant.totals.branches > to).length,
      });
    }
  }
  return impacts;
}

const changed = (a: Catalog, b: Catalog, code: PlanCode) => {
  const x = a.plans[code];
  const y = b.plans[code];
  return {
    name: x.name !== y.name,
    price: x.monthlyPriceVnd !== y.monthlyPriceVnd,
    note: x.note !== y.note,
    branches: x.limits.branches !== y.limits.branches,
    features: FEATURE_SWITCHES.filter(
      (sw) =>
        sw.features.some((f) => x.features.includes(f)) !==
        sw.features.some((f) => y.features.includes(f)),
    ),
  };
};

/** Each change in words, for the bar "Chưa lưu: …". Empty when nothing changed. */
export function planChanges(before: Catalog, after: Catalog): string[] {
  const lines: string[] = [];
  for (const code of PLAN_CODES) {
    const x = before.plans[code];
    const y = after.plans[code];
    const c = changed(before, after, code);
    if (c.name) lines.push(`tên gói ${x.name} → ${y.name}`);
    if (c.price) {
      lines.push(
        `giá tháng ${y.name} ${formatVnd(x.monthlyPriceVnd)} → ${formatVnd(y.monthlyPriceVnd)}`,
      );
    }
    if (c.note) lines.push(`dòng mô tả gói ${y.name}`);
    if (c.branches) {
      lines.push(
        `chi nhánh tối đa gói ${y.name} ${limitText(x.limits.branches)} → ${limitText(y.limits.branches)}`,
      );
    }
    for (const sw of c.features) {
      const on = sw.features.some((f) => y.features.includes(f));
      lines.push(`${on ? 'bật' : 'tắt'} ${sw.label} ở gói ${y.name}`);
    }
  }
  for (const p of after.periods) {
    const old = before.periods.find((q) => q.months === p.months)?.discountPercent;
    if (old !== undefined && old !== p.discountPercent) {
      lines.push(`giảm ${p.months} tháng ${old}% → ${p.discountPercent}%`);
    }
  }
  return lines;
}

/**
 * What a new price or discount does not touch: periods already paid keep their price (BR-83). `null`
 * when no price and no discount changed.
 */
export function pricingNote(before: Catalog, after: Catalog, views: TenantView[]): string | null {
  const discountChanged = after.periods.some(
    (p) => before.periods.find((q) => q.months === p.months)?.discountPercent !== p.discountPercent,
  );
  const plans = PLAN_CODES.filter((code) => discountChanged || changed(before, after, code).price);
  if (plans.length === 0) return null;
  const paying = views.filter(
    (v) => v.state === 'active' && plans.includes(v.subscription.planCode),
  );
  const scope = discountChanged
    ? 'các gói'
    : `gói ${plans.map((code) => after.plans[code].name).join(', ')}`;
  return `Áp cho lần thanh toán từ lúc lưu; ${paying.length} cơ sở đang trả ${scope} giữ giá cũ đến hết kỳ đã trả.`;
}
