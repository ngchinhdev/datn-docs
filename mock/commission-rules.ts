/*
 * Adding and editing commission rules (BR-41, BR-63). Pure, so Node can run it
 * (scripts/check-reports.ts).
 */
import { addAudit, type Actor } from './audit.ts';
import type { CommissionRule, MoneyState } from './fixtures/types.ts';
import { localDate } from './time.ts';

export interface RuleInput {
  scope: CommissionRule['scope'];
  serviceId?: string | undefined;
  level?: number | undefined;
  /** Whole percent, 0 to 100. */
  percent: number;
  /** Local date `YYYY-MM-DD`; not before today. */
  effectiveFrom: string;
  /** The rule being edited; absent when adding. */
  editId?: string | undefined;
}

const dateText = (date: string) => `${date.slice(8, 10)}/${date.slice(5, 7)}/${date.slice(0, 4)}`;

function nextRuleId(rules: readonly CommissionRule[]) {
  const prefix = rules[0]?.id.replace(/-\d+$/, '') ?? 'rule';
  const highest = rules.reduce((m, r) => Math.max(m, Number(r.id.match(/(\d+)$/)?.[1] ?? 0)), 0);
  return `${prefix}-${highest + 1}`;
}

/** Whether a rule is in force on `today`, so editing it adds a new rule instead. */
export const isApplied = (rule: CommissionRule, today: string) => rule.effectiveFrom <= today;

/**
 * BR-41: adds a rule or edits one. A rule already in force is never changed: editing it adds a new
 * rule of the same scope from the chosen day, and the invoices before that day keep the old
 * percent. A rule that has not come into force yet is changed where it stands. Both are logged.
 */
export function saveRule(
  money: MoneyState,
  input: RuleInput,
  ctx: { now: string; actor: Actor; label: (rule: CommissionRule) => string },
): { money: MoneyState; error: string | null } {
  const today = localDate(ctx.now);
  if (!Number.isInteger(input.percent) || input.percent < 0 || input.percent > 100) {
    return { money, error: 'Tỉ lệ từ 0 đến 100%.' };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.effectiveFrom)) {
    return { money, error: 'Chọn ngày hiệu lực.' };
  }
  if (input.effectiveFrom < today) {
    return { money, error: 'Ngày hiệu lực không trước hôm nay (BR-41).' };
  }

  const old = input.editId ? money.commissionRules.find((r) => r.id === input.editId) : undefined;
  if (input.editId && !old) return { money, error: 'Không tìm thấy quy tắc này.' };
  const scope = old?.scope ?? input.scope;
  const serviceId = old ? old.serviceId : input.serviceId;
  const level = old ? old.level : input.level;
  if (scope === 'service' && !serviceId) return { money, error: 'Chọn dịch vụ.' };

  const applied = old !== undefined && isApplied(old, today);
  if (applied && old.percent === input.percent && old.effectiveFrom === input.effectiveFrom) {
    return { money, error: 'Chưa đổi gì.' };
  }
  const next: CommissionRule = {
    id: old && !applied ? old.id : nextRuleId(money.commissionRules),
    scope,
    ...(scope === 'service' && serviceId ? { serviceId } : {}),
    ...(level !== undefined ? { level } : {}),
    percent: input.percent,
    effectiveFrom: input.effectiveFrom,
  };
  const rules =
    old && !applied
      ? money.commissionRules.map((r) => (r.id === old.id ? next : r))
      : [...money.commissionRules, next];
  return {
    money: {
      ...money,
      commissionRules: rules,
      audit: addAudit(money.audit, ctx.now, ctx.actor, {
        action: old ? 'Sửa quy tắc hoa hồng' : 'Thêm quy tắc hoa hồng',
        object: ctx.label(next),
        href: 'commission',
        detail: `${next.percent}% từ ${dateText(next.effectiveFrom)}${
          applied ? ' · quy tắc cũ giữ nguyên cho hóa đơn trước đó' : ''
        }`,
      }),
    },
    error: null,
  };
}
