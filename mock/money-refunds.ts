/*
 * Deciding a refund: what approving does, approving, rejecting, and the automatic refund of a
 * deposit that came too late (BR-27, BR-28, BR-29, BR-42, BR-63). Pure, like `money-ops`.
 */
import { addAudit, SYSTEM_ACTOR } from './audit.ts';
import {
  clawbackEntries,
  periodLabelOf,
  periodOfInstant,
  postEntries,
  ruleFor,
  serviceIdOfVariant,
} from './commission.ts';
import type {
  CommissionEntry,
  InvoiceLine,
  MoneyState,
  RefundRequest,
  WalletEntry,
} from './fixtures/types.ts';
import { formatVnd } from './format.ts';
import { collectedVnd, invoiceTotals, splitWalletRefund, type StaffAmount } from './money.ts';
import type { Ctx, World } from './money-ops.ts';
import { localDate } from './time.ts';

/** "tiền mặt", "thẻ": where a refund goes, in a sentence. */
const NAMES: Record<string, string> = {
  cash: 'tiền mặt',
  transfer: 'chuyển khoản',
  card: 'thẻ',
  wallet: 'ví',
  gateway: 'cổng thanh toán',
};
const methodName = (method: string) => NAMES[method] ?? method;

/** What approving a request does, for the panel and for the approval itself. */
export interface ApprovalEffects {
  /** What each person gets taken back, negative, for the panel (BR-28). */
  clawback: StaffAmount[];
  /** The negative entries posted, one per line, in the period of the day it is approved (BR-42). */
  entries: CommissionEntry[];
  periodLabel: string | null;
  /** A wallet payment goes back to the wallet keeping the ratio (BR-28). */
  wallet: { realVnd: bigint; bonusVnd: bigint } | null;
  /** A package session goes back to the package. */
  returnSession: boolean;
  /** The revenue the session earned when it was used, taken back with it (BR-26). */
  sessionRevenueVnd: bigint | null;
  /** The package sold is given back and can no longer be used (BR-27). */
  packageRefunded: boolean;
  /** What the invoice becomes. */
  status: 'refunded' | 'refunded_partial' | null;
}

export function approvalEffects(
  world: World,
  request: RefundRequest,
  ctx: Pick<Ctx, 'services' | 'levelOf' | 'now'>,
): ApprovalEffects {
  const invoice = world.money.invoices.find((i) => i.id === request.invoiceId);
  const payment = world.money.payments.find((p) => p.id === request.paymentId);
  const effects: ApprovalEffects = {
    clawback: [],
    entries: [],
    periodLabel: periodLabelOf(periodOfInstant(ctx.now)),
    wallet: null,
    returnSession: Boolean(request.returnSession),
    sessionRevenueVnd: null,
    packageRefunded: Boolean(request.packageId),
    status: null,
  };
  if (!invoice) return effects;
  const totals = invoiceTotals(invoice.lines, invoice.discount, invoice.depositVnd);
  // BR-42: with the percent of the line it takes back; one the line never earned from follows the rule of its day.
  const fallback = (line: InvoiceLine) => {
    const rule = ruleFor(world.money.commissionRules, {
      retail: line.kind === 'retail',
      serviceId: serviceIdOfVariant(ctx.services, line.serviceVariantId),
      level: line.staffResourceId ? ctx.levelOf(line.staffResourceId) : undefined,
      date: localDate(invoice.paidAt ?? ctx.now),
    });
    return rule ? { percent: rule.percent, ruleId: rule.id } : null;
  };
  effects.entries = clawbackEntries({
    refundId: request.id,
    invoice,
    earned: world.money.commission.filter((c) => c.invoiceId === invoice.id),
    refundVnd: request.amountVnd,
    ...(request.lineId ? { lineId: request.lineId } : {}),
    ...(request.returnSession ? { returnSession: true } : {}),
    discountVnd: totals.discount,
    at: ctx.now,
    fallback,
  });
  for (const e of effects.entries) {
    const found = effects.clawback.find((c) => c.staffResourceId === e.staffResourceId);
    if (found) found.amountVnd += e.amountVnd;
    else effects.clawback.push({ staffResourceId: e.staffResourceId, amountVnd: e.amountVnd });
  }
  const line = invoice.lines.find((l) => l.id === request.lineId);
  if (request.returnSession && line?.staffResourceId && line.sessionRevenueVnd) {
    effects.sessionRevenueVnd = line.sessionRevenueVnd;
  }
  if (payment?.method === 'wallet') {
    effects.wallet = splitWalletRefund(payment, world.money.refunds, request.amountVnd);
  }
  const collected = collectedVnd(invoice, world.money.payments);
  const given = world.money.refunds
    .filter((r) => r.invoiceId === invoice.id && (r.status === 'approved' || r.status === 'auto'))
    .reduce((m, r) => m + r.amountVnd, 0n);
  effects.status = given + request.amountVnd >= collected ? 'refunded' : 'refunded_partial';
  return effects;
}

/**
 * BR-28, BR-63: a manager approves. The money goes back the way it came, the commission of the
 * refund is taken back in the open period (BR-42), a package session returns, and it is logged.
 */
export function approveRefund(
  world: World,
  refundId: string,
  ctx: Ctx,
): { world: World; error: string | null } {
  const request = world.money.refunds.find((r) => r.id === refundId);
  if (!request || request.status !== 'pending') {
    return { world, error: 'Yêu cầu này đã được xử lý.' };
  }
  const invoice = world.money.invoices.find((i) => i.id === request.invoiceId);
  if (!invoice) return { world, error: 'Không tìm thấy hóa đơn của yêu cầu.' };
  const effects = approvalEffects(world, request, ctx);

  const entries: WalletEntry[] = [];
  if (effects.wallet && invoice.customerId) {
    entries.push({
      id: `wl-${request.id}`,
      customerId: invoice.customerId,
      at: ctx.now,
      realVnd: effects.wallet.realVnd,
      bonusVnd: effects.wallet.bonusVnd,
      kind: 'refund',
      memo: `Hoàn ${invoice.number}`,
      invoiceId: invoice.id,
      idempotencyKey: `refund:${request.id}`,
    });
  }
  let customers = world.customers;
  const customer = customers.find((c) => c.id === invoice.customerId);
  if (customer?.packages) {
    const line = invoice.lines.find((l) => l.id === request.lineId);
    const packages = customer.packages.map((p) => {
      if (request.returnSession && line?.packageId === p.id) {
        return {
          ...p,
          usedSessions: Math.max(0, p.usedSessions - 1),
          remainingSessions: p.remainingSessions + 1,
        };
      }
      if (request.packageId === p.id) return { ...p, refunded: true };
      return p;
    });
    customers = customers.map((c) => (c.id === customer.id ? { ...c, packages } : c));
  }

  const money = postEntries(
    {
      ...world.money,
      refunds: world.money.refunds.map((r) =>
        r.id === request.id
          ? {
              ...r,
              status: 'approved' as const,
              decidedBy: ctx.actor,
              decidedAt: ctx.now,
              ...(effects.wallet
                ? {
                    walletRealVnd: effects.wallet.realVnd,
                    walletBonusVnd: effects.wallet.bonusVnd,
                  }
                : {}),
            }
          : r,
      ),
      walletEntries: [...world.money.walletEntries, ...entries],
      audit: addAudit(
        world.money.audit,
        ctx.now,
        { name: ctx.actor, role: ctx.role },
        {
          action: 'Duyệt hoàn tiền',
          object: invoice.number,
          href: `invoices/${invoice.id}`,
          detail: `${formatVnd(request.amountVnd)} về ${methodName(request.method)} · ${request.reason}`,
        },
      ),
    },
    effects.entries,
  );
  return { world: { ...world, customers, money }, error: null };
}

/** A rejection needs a note, which the person who asked can read (BR-28). */
export function rejectRefund(
  world: World,
  refundId: string,
  note: string,
  ctx: Ctx,
): { world: World; error: string | null } {
  const request = world.money.refunds.find((r) => r.id === refundId);
  if (!request || request.status !== 'pending') {
    return { world, error: 'Yêu cầu này đã được xử lý.' };
  }
  if (note.trim() === '') return { world, error: 'Nhập ghi chú khi từ chối.' };
  const invoice = world.money.invoices.find((i) => i.id === request.invoiceId);
  return {
    world: {
      ...world,
      money: {
        ...world.money,
        refunds: world.money.refunds.map((r) =>
          r.id === request.id
            ? {
                ...r,
                status: 'rejected' as const,
                decidedBy: ctx.actor,
                decidedAt: ctx.now,
                rejectNote: note.trim(),
              }
            : r,
        ),
        audit: addAudit(
          world.money.audit,
          ctx.now,
          { name: ctx.actor, role: ctx.role },
          {
            action: 'Từ chối hoàn tiền',
            object: invoice?.number ?? request.what,
            ...(invoice ? { href: `invoices/${invoice.id}` } : {}),
            detail: `${formatVnd(request.amountVnd)} · ${note.trim()}`,
          },
        ),
      },
    },
    error: null,
  };
}

/**
 * BR-29: the deposit came after the hold ran out and the time is taken, so the shop gives it back
 * in full without anyone approving. One request per booking.
 */
export function addAutoRefund(
  money: MoneyState,
  input: { key: string; amountVnd: bigint; slotLabel: string; at: string },
): MoneyState {
  const id = `rf-auto-${input.key}`;
  if (money.refunds.some((r) => r.id === id)) return money;
  const request: RefundRequest = {
    id,
    invoiceId: null,
    paymentId: null,
    customerId: null,
    who: 'Khách đặt online',
    what: `Cọc lịch ${input.slotLabel} · tiền về muộn`,
    amountVnd: input.amountVnd,
    method: 'transfer',
    reason: 'Giờ đã có người đặt (BR-29)',
    createdBy: 'Tự động',
    createdAt: input.at,
    status: 'auto',
  };
  return {
    ...money,
    refunds: [...money.refunds, request],
    audit: addAudit(money.audit, input.at, SYSTEM_ACTOR, {
      action: 'Hoàn cọc tự động',
      object: `Lịch ${input.slotLabel}`,
      href: 'refunds',
      detail: `${formatVnd(input.amountVnd)} · giờ đã có người đặt (BR-29)`,
    }),
  };
}
