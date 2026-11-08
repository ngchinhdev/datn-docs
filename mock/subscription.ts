/**
 * Plans, trial and entitlements of a tenant (D-15, T-17, BR-80 to BR-88).
 *
 * This is the sample of the rules, to copy into `datn-saas` together with its tests: plain
 * functions, money as integer VND (`bigint`), dates as local `YYYY-MM-DD` strings, and the
 * current time always an argument, never read from a clock (rule 2). Nothing here touches React.
 */
import { TRIAL_DAYS } from './signup';
import { addDays, localDate, localToUtc, MOCK_NOW } from './time';

export type FeatureCode =
  'multi_branch' | 'packages_wallet' | 'commission' | 'full_reports' | 'chatbot';

export type PlanCode = 'basic' | 'pro';

export interface Plan {
  code: PlanCode;
  name: string;
  /** Integer VND, for one month. */
  monthlyPriceVnd: bigint;
  features: FeatureCode[];
  /** `null` is unlimited. */
  limits: { branches: number | null };
  /** One line under the price. */
  note: string;
}

/** BR-83: data the platform admin edits, not constants of the code. */
export const plans: Record<PlanCode, Plan> = {
  basic: {
    code: 'basic',
    name: 'Cơ bản',
    monthlyPriceVnd: 199_000n,
    features: [],
    limits: { branches: 1 },
    note: '1 chi nhánh',
  },
  pro: {
    code: 'pro',
    name: 'Chuyên nghiệp',
    monthlyPriceVnd: 399_000n,
    features: ['multi_branch', 'packages_wallet', 'commission', 'full_reports', 'chatbot'],
    limits: { branches: null },
    note: 'Không giới hạn chi nhánh',
  },
};

export const PLAN_CODES: PlanCode[] = ['basic', 'pro'];

/** The list every plan card shows, in this order. `requires` empty means every plan has it. */
export const planFeatureList: { label: string; requires: FeatureCode[] }[] = [
  { label: 'Đặt lịch online trên trang riêng của cơ sở', requires: [] },
  { label: 'Lịch nhân viên và tài nguyên, kéo thả đổi giờ', requires: [] },
  { label: 'Thu tiền, cọc online, nhắc lịch qua email', requires: [] },
  { label: 'Không giới hạn nhân viên và lịch hẹn', requires: [] },
  { label: 'Nhiều chi nhánh', requires: ['multi_branch'] },
  { label: 'Gói liệu trình, ví trả trước', requires: ['packages_wallet'] },
  { label: 'Hoa hồng nhân viên, báo cáo đầy đủ', requires: ['commission', 'full_reports'] },
  { label: 'Chatbot đặt lịch', requires: ['chatbot'] },
];

export const planHasAll = (plan: Plan, required: FeatureCode[]) =>
  required.every((f) => plan.features.includes(f));

/** The mock's "now" for everything about plans: two days after the sample tenant was created. */
export const PLAN_NOW = '2026-11-09T03:20:00Z';
export const PLAN_TODAY = localDate(PLAN_NOW);

/** What the platform stores per tenant. Dates are the last day, valid until 23:59 local time. */
export interface Subscription {
  planCode: PlanCode;
  /** Last day of the trial; `null` once the tenant has paid. */
  trialEndsOn: string | null;
  /** Last day of the paid period; `null` while the tenant has never paid. */
  periodEndsOn: string | null;
  /** Platform lock for a violation (BR-75); not a plan state. */
  locked?: boolean;
  /** Plan that starts with the next period (a downgrade, BR-85). */
  pendingPlan?: PlanCode | null;
}

export type Mode = 'trial' | 'active' | 'expired' | 'locked';

export interface Entitlements {
  mode: Mode;
  planCode: PlanCode;
  features: FeatureCode[];
  limits: Plan['limits'];
  trialEndsOn: string | null;
  periodEndsOn: string | null;
}

const endOfDay = (date: string) => Date.parse(localToUtc(date, '23:59')) + 59_999;

/**
 * T-17: the mode comes from comparing `now` with the stored dates, never from a status a job
 * had to flip. A trial has every feature of the Professional plan (BR-81); an expired or
 * locked tenant has none.
 */
export function entitlements(sub: Subscription, now: string): Entitlements {
  const at = Date.parse(now);
  let mode: Mode;
  if (sub.locked) mode = 'locked';
  else if (sub.periodEndsOn) mode = at <= endOfDay(sub.periodEndsOn) ? 'active' : 'expired';
  else if (sub.trialEndsOn) mode = at <= endOfDay(sub.trialEndsOn) ? 'trial' : 'expired';
  else mode = 'expired';

  const plan = plans[sub.planCode];
  const features = mode === 'trial' ? plans.pro.features : mode === 'active' ? plan.features : [];
  return {
    mode,
    planCode: sub.planCode,
    features,
    limits: plan.limits,
    trialEndsOn: sub.trialEndsOn,
    periodEndsOn: sub.periodEndsOn,
  };
}

export const can = (e: Entitlements, feature: FeatureCode) => e.features.includes(feature);

/** BR-81, BR-82: online booking and creating appointments need a paid, current period. */
export const canBook = (e: Entitlements) => e.mode === 'active';

/** Calendar days left including `today`: the last day counts until 23:59. */
export function daysLeft(endsOn: string, today: string): number {
  const days = (Date.parse(`${endsOn}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000;
  return Math.max(0, days + 1);
}

/** The date a mode runs to: the trial's last day or the period's. */
export const endsOn = (e: Entitlements) => (e.mode === 'trial' ? e.trialEndsOn : e.periodEndsOn);

// ---------------------------------------------------------------------------------------------
// Prices (BR-84, BR-85)

export const PERIODS = [
  { months: 1, discountPercent: 0 },
  { months: 3, discountPercent: 10 },
  { months: 12, discountPercent: 20 },
] as const;

export type PeriodMonths = (typeof PERIODS)[number]['months'];

const THOUSAND = 1000n;

/** Rounds to the nearest thousand: 1.077.300 becomes 1.077.000. */
const roundToThousand = (amount: bigint) => ((amount + THOUSAND / 2n) / THOUSAND) * THOUSAND;

const ceilToThousand = (amount: bigint) => ((amount + THOUSAND - 1n) / THOUSAND) * THOUSAND;

/** BR-84: what a plan costs for `months`, discounted and rounded to a thousand. */
export function periodPrice(plan: Plan, months: PeriodMonths): bigint {
  const discount = BigInt(PERIODS.find((p) => p.months === months)?.discountPercent ?? 0);
  return roundToThousand((plan.monthlyPriceVnd * BigInt(months) * (100n - discount)) / 100n);
}

/**
 * BR-85: moving up in the middle of a period costs the difference of the monthly prices for the
 * days left, over 30, rounded up to a thousand. The end of the period does not move.
 */
export function upgradeCharge(from: Plan, to: Plan, days: number): bigint {
  const difference = to.monthlyPriceVnd - from.monthlyPriceVnd;
  if (difference <= 0n || days <= 0) return 0n;
  // ceil(difference * days / 30 / 1000) * 1000, in one division so nothing is rounded twice.
  const unit = 30n * THOUSAND;
  return ((difference * BigInt(days) + unit - 1n) / unit) * THOUSAND;
}

// ---------------------------------------------------------------------------------------------
// Buying

/** The same day `n` months later, or the last day of that month when it has no such day. */
export function addMonths(date: string, n: number): string {
  const [year, month, day] = date.split('-').map(Number) as [number, number, number];
  const index = month - 1 + n;
  const targetYear = year + Math.floor(index / 12);
  const targetMonth = ((index % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  return new Date(Date.UTC(targetYear, targetMonth, Math.min(day, lastDay)))
    .toISOString()
    .slice(0, 10);
}

/** Last day of a period of `months` that starts on `start`: 09/11 plus 1 month ends 08/12. */
export const periodEnd = (start: string, months: number) => addDays(addMonths(start, months), -1);

export type Purchase =
  | { kind: 'buy'; planCode: PlanCode; months: PeriodMonths }
  | { kind: 'renew'; planCode: PlanCode; months: PeriodMonths }
  | { kind: 'upgrade'; planCode: PlanCode }
  | { kind: 'downgrade'; planCode: PlanCode };

export interface Payment {
  id: string;
  /** Local date. */
  date: string;
  label: string;
  /** Integer VND; 0 for a downgrade that is only scheduled. */
  amountVnd: bigint;
}

/**
 * The rule of each kind of purchase, from the state the tenant is in:
 * - `buy` (trial or expired): the period starts today;
 * - `renew`: the new period starts the day after the current one ends;
 * - `upgrade`: the plan changes now, the end stays, the charge is `upgradeCharge`;
 * - `downgrade`: only recorded; it takes effect with the next period.
 */
export function purchase(
  sub: Subscription,
  p: Purchase,
  today: string,
): { subscription: Subscription; payment: Payment } {
  const plan = plans[p.planCode];
  switch (p.kind) {
    case 'buy': {
      const end = periodEnd(today, p.months);
      return {
        subscription: {
          ...sub,
          planCode: p.planCode,
          trialEndsOn: null,
          periodEndsOn: end,
          pendingPlan: null,
        },
        payment: {
          id: `pay-${today}-${p.planCode}`,
          date: today,
          label: `Kích hoạt gói ${plan.name}, ${p.months} tháng`,
          amountVnd: periodPrice(plan, p.months),
        },
      };
    }
    case 'renew': {
      const start = addDays(sub.periodEndsOn ?? addDays(today, -1), 1);
      return {
        subscription: {
          ...sub,
          planCode: p.planCode,
          periodEndsOn: periodEnd(start, p.months),
          pendingPlan: null,
        },
        payment: {
          id: `pay-${today}-renew-${p.planCode}`,
          date: today,
          label: `Gia hạn gói ${plan.name}, ${p.months} tháng`,
          amountVnd: periodPrice(plan, p.months),
        },
      };
    }
    case 'upgrade': {
      const left = daysLeft(sub.periodEndsOn ?? today, today);
      return {
        subscription: { ...sub, planCode: p.planCode, pendingPlan: null },
        payment: {
          id: `pay-${today}-upgrade-${p.planCode}`,
          date: today,
          label: `Nâng lên gói ${plan.name}`,
          amountVnd: upgradeCharge(plans[sub.planCode], plan, left),
        },
      };
    }
    case 'downgrade':
      return {
        subscription: { ...sub, pendingPlan: p.planCode },
        payment: {
          id: `pay-${today}-downgrade-${p.planCode}`,
          date: today,
          label: `Hạ xuống gói ${plan.name} từ kỳ sau`,
          amountVnd: 0n,
        },
      };
  }
}

/** BR-85: a downgrade needs the tenant to fit the limits of the lower plan. */
export function downgradeBlock(target: Plan, activeBranches: number): string | null {
  const max = target.limits.branches;
  if (max !== null && activeBranches > max) {
    return `Tạm dừng bớt chi nhánh, chỉ giữ ${max}, rồi mới hạ được gói`;
  }
  return null;
}

// ---------------------------------------------------------------------------------------------
// Sample tenants and the `?plan=` override of the mock

/** Plan of each sample tenant, paid until the same day. */
const DEFAULT_PLAN: Record<string, PlanCode> = { 'toc-may': 'pro', pawpaw: 'basic' };

/** The day the sample tenants' trial ends; they signed up on `MOCK_NOW` and the trial counts that day. */
export const TRIAL_ENDS_ON = addDays(localDate(MOCK_NOW), TRIAL_DAYS - 1);

export const DEFAULT_PERIOD_END = '2026-11-30';
/** Hết hạn is tried with a period that ended yesterday, before the appointments in the data. */
export const EXPIRED_PERIOD_END = addDays(PLAN_TODAY, -1);

export type PlanOverride = 'trial' | 'basic' | 'pro' | 'expired';

export const PLAN_OVERRIDES: { value: PlanOverride; label: string }[] = [
  { value: 'trial', label: 'Dùng thử' },
  { value: 'basic', label: 'Cơ bản' },
  { value: 'pro', label: 'Chuyên nghiệp' },
  { value: 'expired', label: 'Hết hạn' },
];

export const planOverrideOf = (value: string | null | undefined): PlanOverride | null =>
  PLAN_OVERRIDES.find((o) => o.value === value)?.value ?? null;

/** The subscription a tenant has in the mock; `plan` and `periodEnd` come from the query string. */
export function mockSubscription(
  tenantSlug: string,
  override: PlanOverride | null,
  periodEndParam?: string | null,
): Subscription {
  const own = DEFAULT_PLAN[tenantSlug] ?? 'pro';
  const periodEnd =
    periodEndParam && /^\d{4}-\d{2}-\d{2}$/.test(periodEndParam)
      ? periodEndParam
      : DEFAULT_PERIOD_END;
  switch (override) {
    case 'trial':
      return { planCode: 'pro', trialEndsOn: TRIAL_ENDS_ON, periodEndsOn: null };
    case 'basic':
    case 'pro':
      return { planCode: override, trialEndsOn: null, periodEndsOn: periodEnd };
    case 'expired':
      return { planCode: own, trialEndsOn: null, periodEndsOn: EXPIRED_PERIOD_END };
    default:
      return { planCode: own, trialEndsOn: null, periodEndsOn: periodEnd };
  }
}

/** The payment that started the current period, for the history of a tenant that has paid. */
export function seedPayments(sub: Subscription): Payment[] {
  if (!sub.periodEndsOn) return [];
  const plan = plans[sub.planCode];
  const start = addMonths(addDays(sub.periodEndsOn, 1), -1);
  return [
    {
      id: 'pay-seed',
      date: start,
      label: `Kích hoạt gói ${plan.name}, 1 tháng`,
      amountVnd: periodPrice(plan, 1),
    },
  ];
}

// ---------------------------------------------------------------------------------------------
// Locked features (BR-87)

export interface FeatureInfo {
  /** Page title: "Chatbot đặt lịch". */
  title: string;
  /** Start of the sentence "<short> có ở gói Chuyên nghiệp". */
  short: string;
  /** What it does, in two sentences, for the page that explains it. */
  summary: string;
}

export const featureInfo: Partial<Record<FeatureCode, FeatureInfo>> = {
  chatbot: {
    title: 'Chatbot đặt lịch',
    short: 'Chatbot',
    summary:
      'Khách hỏi giá, hỏi giờ trống và giữ chỗ ngay trong khung chat trên trang đặt lịch, kể cả ngoài giờ làm. Chatbot chỉ trả lời bằng dữ liệu thật của cơ sở: dịch vụ, giá, giờ trống.',
  },
  packages_wallet: {
    title: 'Gói liệu trình',
    short: 'Gói liệu trình và ví trả trước',
    summary:
      'Bán gói nhiều buổi và ví trả trước cho khách quen. Mỗi lần khách đến, hệ thống tự trừ một buổi hoặc trừ tiền trong ví, và ghi vào sổ.',
  },
  commission: {
    title: 'Hoa hồng',
    short: 'Hoa hồng nhân viên',
    summary:
      'Tính hoa hồng theo dịch vụ và theo từng nhân viên, chia khi nhiều người cùng làm một lịch hẹn, chốt kỳ và đưa khoản thu hồi vào kỳ sau.',
  },
  full_reports: {
    title: 'Báo cáo',
    short: 'Báo cáo đầy đủ',
    summary:
      'Doanh thu, số lịch hẹn, tỉ lệ không đến và hiệu suất theo nhân viên, tài nguyên và dịch vụ, xuất ra file để đối chiếu.',
  },
};
