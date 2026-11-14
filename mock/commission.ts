/*
 * Commission (BR-40, BR-41, BR-42): which rule a line falls under, what each line earns, the
 * monthly periods, the clawback of a refund and closing a period. Pure; imports types and the
 * clock helpers only, so Node can run it (scripts/check-reports.ts). Every amount is a `bigint`.
 */
import { addAudit, type Actor } from './audit.ts';
import type {
  CommissionEntry,
  CommissionPeriod,
  CommissionRule,
  Invoice,
  InvoiceLine,
  MoneyState,
  Service,
} from './fixtures/types.ts';
import { formatVnd } from './format.ts';
import { netByLine } from './money.ts';
import { addDays, localDate } from './time.ts';

/** The service a variant belongs to. */
export const serviceIdOfVariant = (services: readonly Service[], variantId: string | undefined) =>
  services.find((s) => s.variants.some((v) => v.id === variantId))?.id;

/** What decides the rule of a line: what it is, who did it, when it was collected. */
export interface RuleQuery {
  retail: boolean;
  serviceId?: string | undefined;
  /** 1-based level of the person; absent when unknown. */
  level?: number | undefined;
  /** Local date the invoice was collected, `YYYY-MM-DD`. */
  date: string;
}

/** How specific a rule is: service and level > service > every service and a level > every service. */
function rank(rule: CommissionRule) {
  return (rule.scope === 'service' ? 2 : 0) + (rule.level !== undefined ? 1 : 0);
}

/**
 * BR-41: the most specific rule in force on the day. Of two equally specific, the one that took
 * effect later, then the one added later. A retail line only meets retail rules; a service line
 * never meets them.
 */
export function ruleFor(rules: readonly CommissionRule[], query: RuleQuery): CommissionRule | null {
  let best: CommissionRule | null = null;
  for (const rule of rules) {
    if (rule.effectiveFrom > query.date) continue;
    if (query.retail ? rule.scope !== 'retail' : rule.scope === 'retail') continue;
    if (rule.scope === 'service' && rule.serviceId !== query.serviceId) continue;
    if (rule.level !== undefined && rule.level !== query.level) continue;
    if (
      !best ||
      rank(rule) > rank(best) ||
      (rank(rule) === rank(best) && rule.effectiveFrom >= best.effectiveFrom)
    ) {
      best = rule;
    }
  }
  return best;
}

/** What a rule applies to, in words: `Mọi dịch vụ`, `Nhuộm tóc`, `Bán lẻ`. */
export function ruleScopeLabel(rule: CommissionRule, services: readonly Service[]): string {
  if (rule.scope === 'retail') return 'Bán lẻ';
  if (rule.scope === 'all') return 'Mọi dịch vụ';
  return services.find((s) => s.id === rule.serviceId)?.name ?? 'Dịch vụ đã xóa';
}

/** The level of a rule in words: `Mọi cấp`, `Thợ chính`. */
export const ruleLevelLabel = (rule: CommissionRule, levels: readonly string[]) =>
  rule.level === undefined ? 'Mọi cấp' : (levels[rule.level - 1] ?? `Cấp ${rule.level}`);

/** Whether a rule has not come into force yet on `today`. */
export const ruleIsPending = (rule: CommissionRule, today: string) => rule.effectiveFrom > today;

// --- Periods (BR-42) --------------------------------------------------------------------------

/** `2026-11` of a local date. */
export const periodIdOf = (date: string) => date.slice(0, 7);

/** `11/2026`. */
export const periodLabelOf = (id: string) => `${id.slice(5, 7)}/${id.slice(0, 4)}`;

/** First and last local date of a period. */
export function periodRange(id: string): { from: string; to: string } {
  const from = `${id}-01`;
  const next = new Date(Date.parse(`${from}T00:00:00Z`));
  next.setUTCMonth(next.getUTCMonth() + 1);
  return { from, to: addDays(next.toISOString().slice(0, 10), -1) };
}

/** BR-42: the period an instant falls in, in branch time. */
export const periodOfInstant = (iso: string) => periodIdOf(localDate(iso));

/** `open`: the month is running; `ended`: over and not closed; `closed`: locked by the owner. */
export type PeriodState = 'open' | 'ended' | 'closed';

export function periodState(period: CommissionPeriod, today: string): PeriodState {
  if (period.status === 'closed') return 'closed';
  return today > periodRange(period.id).to ? 'ended' : 'open';
}

/** BR-42: only a month that is over can be closed. */
export const canClose = (period: CommissionPeriod, today: string) =>
  periodState(period, today) === 'ended';

/** BR-42: seven days after the month ended without a close, Tổng quan reminds the owner. */
export const closeReminderDue = (period: CommissionPeriod, today: string) =>
  period.status === 'open' && today >= addDays(periodRange(period.id).to, 7);

/** The list with the period of `id` in it; a month nobody posted to yet starts open. */
export function withPeriod(periods: readonly CommissionPeriod[], id: string): CommissionPeriod[] {
  if (periods.some((p) => p.id === id)) return [...periods];
  return [...periods, { id, label: periodLabelOf(id), status: 'open' as const }].sort((a, b) =>
    a.id < b.id ? 1 : -1,
  );
}

/** BR-42: a closed period takes nothing more; entries aimed at one are dropped. */
export function postEntries(money: MoneyState, entries: readonly CommissionEntry[]): MoneyState {
  let periods = money.periods;
  const kept: CommissionEntry[] = [];
  for (const entry of entries) {
    const found = periods.find((p) => p.id === entry.periodId);
    if (found?.status === 'closed') continue;
    periods = withPeriod(periods, entry.periodId);
    kept.push(entry);
  }
  return { ...money, periods, commission: [...money.commission, ...kept] };
}

// --- Earning (BR-40) --------------------------------------------------------------------------

export interface EarnInput {
  invoice: Invoice;
  /** The lines as collected: a session line already carries `sessionRevenueVnd`. */
  lines: readonly InvoiceLine[];
  discountVnd: bigint;
  rules: readonly CommissionRule[];
  services: readonly Service[];
  /** Level of a member of staff, 1-based. */
  levelOf: (staffResourceId: string) => number | undefined;
  /** ISO 8601, UTC: when the invoice was collected. */
  at: string;
}

/**
 * BR-40, BR-41: for each service or retail line with a person, the rule of the day times what was
 * really collected for the line after its share of the discount; a package session is worth its
 * revenue (BR-26); a retail line without a seller earns nobody anything.
 */
export function earnEntries(input: EarnInput): CommissionEntry[] {
  const date = localDate(input.at);
  const out: CommissionEntry[] = [];
  for (const { line, net } of netByLine(input.lines, input.discountVnd)) {
    if (line.kind !== 'service' && line.kind !== 'retail') continue;
    if (!line.staffResourceId) continue;
    const base = line.packageId ? (line.sessionRevenueVnd ?? 0n) : net;
    if (base <= 0n) continue;
    const rule = ruleFor(input.rules, {
      retail: line.kind === 'retail',
      serviceId: serviceIdOfVariant(input.services, line.serviceVariantId),
      level: input.levelOf(line.staffResourceId),
      date,
    });
    if (!rule) continue;
    out.push({
      id: `com-${line.id}`,
      staffResourceId: line.staffResourceId,
      periodId: periodIdOf(date),
      amountVnd: (base * BigInt(rule.percent)) / 100n,
      invoiceId: input.invoice.id,
      kind: 'earn',
      at: input.at,
      lineId: line.id,
      ruleId: rule.id,
      percent: rule.percent,
      baseVnd: base,
      source: line.kind === 'retail' ? 'retail' : 'service',
      ...(line.packageId && line.sessionNo ? { sessionNo: line.sessionNo } : {}),
    });
  }
  return out;
}

// --- Clawback (BR-28, BR-42) ------------------------------------------------------------------

export interface ClawbackInput {
  /** Prefix of the ids: the id of the refund request. */
  refundId: string;
  invoice: Invoice;
  /** Everything already posted for this invoice. */
  earned: readonly CommissionEntry[];
  refundVnd: bigint;
  /** The line the refund is about; without it the refund is shared over the lines (BR-28). */
  lineId?: string;
  /** The refund gives a package session back: its revenue goes back too (BR-26). */
  returnSession?: boolean;
  discountVnd: bigint;
  /** ISO 8601, UTC: when the refund is approved; it decides the period (BR-42). */
  at: string;
  /** The percent of a line that has no entry of its own, from the rule of the day it was collected. */
  fallback: (line: InvoiceLine) => { percent: number; ruleId?: string } | null;
}

/**
 * BR-42: a refund takes commission back as negative entries in the period of the day it is
 * approved, each with the percent of the entry it takes back; the period of the invoice does not
 * change. A refund about one line takes it from that line's person; otherwise it is shared over
 * the lines in proportion to what they were worth.
 */
export function clawbackEntries(input: ClawbackInput): CommissionEntry[] {
  const periodId = periodOfInstant(input.at);
  const percentOf = (line: InvoiceLine) => {
    const own = input.earned.find((e) => e.kind === 'earn' && e.lineId === line.id);
    if (own) return { percent: own.percent, ...(own.ruleId ? { ruleId: own.ruleId } : {}) };
    return input.fallback(line);
  };
  const out: CommissionEntry[] = [];
  const push = (line: InvoiceLine, base: bigint, id: string, sessionNo?: number) => {
    const found = percentOf(line);
    if (!found || !line.staffResourceId || base <= 0n) return;
    const amount = (base * BigInt(found.percent)) / 100n;
    if (amount === 0n) return;
    out.push({
      id,
      staffResourceId: line.staffResourceId,
      periodId,
      amountVnd: -amount,
      invoiceId: input.invoice.id,
      kind: 'clawback',
      at: input.at,
      lineId: line.id,
      ...(found.ruleId ? { ruleId: found.ruleId } : {}),
      percent: found.percent,
      baseVnd: -base,
      source: line.kind === 'retail' ? 'retail' : 'service',
      ...(sessionNo ? { sessionNo } : {}),
    });
  };

  const line = input.invoice.lines.find((l) => l.id === input.lineId);
  if (input.refundVnd > 0n) {
    if (line) {
      push(line, input.refundVnd, `com-${input.refundId}-${line.id}`);
    } else {
      // The share of a line is over every service and retail line worth something, with or without
      // a person; only a line with a person is taken back from.
      const shares = netByLine(input.invoice.lines, input.discountVnd).filter(
        (s) => (s.line.kind === 'service' || s.line.kind === 'retail') && s.net > 0n,
      );
      const total = shares.reduce((m, s) => m + s.net, 0n);
      for (const s of shares) {
        if (!s.line.staffResourceId) continue;
        push(s.line, (input.refundVnd * s.net) / total, `com-${input.refundId}-${s.line.id}`);
      }
    }
  }
  if (input.returnSession && line?.packageId && line.sessionRevenueVnd) {
    push(line, line.sessionRevenueVnd, `com-${input.refundId}-${line.id}-session`, line.sessionNo);
  }
  return out;
}

// --- Totals -----------------------------------------------------------------------------------

export interface StaffPeriodTotals {
  staffResourceId: string;
  serviceVnd: bigint;
  serviceLines: number;
  retailVnd: bigint;
  retailLines: number;
  /** Negative or zero. */
  clawbackVnd: bigint;
  totalVnd: bigint;
}

/** What each person has in a period, in the order of first appearance. */
export function periodTotals(
  commission: readonly CommissionEntry[],
  periodId: string,
): StaffPeriodTotals[] {
  const out = new Map<string, StaffPeriodTotals>();
  for (const e of commission) {
    if (e.periodId !== periodId) continue;
    const row = out.get(e.staffResourceId) ?? {
      staffResourceId: e.staffResourceId,
      serviceVnd: 0n,
      serviceLines: 0,
      retailVnd: 0n,
      retailLines: 0,
      clawbackVnd: 0n,
      totalVnd: 0n,
    };
    if (e.kind === 'clawback') row.clawbackVnd += e.amountVnd;
    else if (e.source === 'retail') {
      row.retailVnd += e.amountVnd;
      row.retailLines += 1;
    } else {
      row.serviceVnd += e.amountVnd;
      row.serviceLines += 1;
    }
    row.totalVnd += e.amountVnd;
    out.set(e.staffResourceId, row);
  }
  return [...out.values()];
}

/** Total and clawback of a whole period. */
export function periodSummary(commission: readonly CommissionEntry[], periodId: string) {
  const rows = periodTotals(commission, periodId);
  return {
    totalVnd: rows.reduce((m, r) => m + r.totalVnd, 0n),
    clawbackVnd: rows.reduce((m, r) => m + r.clawbackVnd, 0n),
  };
}

// --- Closing (BR-42, BR-63) -------------------------------------------------------------------

/** The owner closes a month that is over; the period is locked and the close is logged. */
export function closePeriod(
  money: MoneyState,
  periodId: string,
  ctx: { now: string; actor: Actor },
): { money: MoneyState; error: string | null } {
  const period = money.periods.find((p) => p.id === periodId);
  if (!period) return { money, error: 'Không tìm thấy kỳ này.' };
  if (period.status === 'closed') return { money, error: 'Kỳ này đã chốt.' };
  if (!canClose(period, localDate(ctx.now))) {
    return { money, error: 'Tháng này chưa hết, chưa chốt được.' };
  }
  const total = periodSummary(money.commission, periodId).totalVnd;
  return {
    money: {
      ...money,
      periods: money.periods.map((p) =>
        p.id === periodId
          ? { ...p, status: 'closed', closedAt: ctx.now, closedBy: ctx.actor.name }
          : p,
      ),
      audit: addAudit(money.audit, ctx.now, ctx.actor, {
        action: 'Chốt kỳ hoa hồng',
        object: `Kỳ ${period.label}`,
        href: `commission/periods/${period.id}`,
        detail: `Tổng ${formatVnd(total)}`,
      }),
    },
    error: null,
  };
}
