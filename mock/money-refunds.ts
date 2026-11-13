/*
 * Deciding a refund: what approving does, approving, rejecting, and the automatic refund of a
 * deposit that came too late (BR-27, BR-28, BR-29, BR-42, BR-63). Pure, like `money-ops`.
 */
import type { CommissionEntry, MoneyState, RefundRequest, WalletEntry } from './fixtures/types.ts';
import { formatVnd } from './format.ts';
import {
  collectedVnd,
  commissionClawback,
  invoiceTotals,
  splitWalletRefund,
  type StaffAmount,
} from './money.ts';
import type { Ctx, World } from './money-ops.ts';

/** What approving a request does, for the panel and for the approval itself. */
export interface ApprovalEffects {
  /** Negative postings of commission, one per person, in the open period (BR-28, BR-42). */
  clawback: StaffAmount[];
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
  percent: number,
): ApprovalEffects {
  const invoice = world.money.invoices.find((i) => i.id === request.invoiceId);
  const payment = world.money.payments.find((p) => p.id === request.paymentId);
  const open = world.money.periods.find((p) => p.status === 'open');
  const effects: ApprovalEffects = {
    clawback: [],
    periodLabel: open?.label ?? null,
    wallet: null,
    returnSession: Boolean(request.returnSession),
    sessionRevenueVnd: null,
    packageRefunded: Boolean(request.packageId),
    status: null,
  };
  if (!invoice) return effects;
  const totals = invoiceTotals(invoice.lines, invoice.discount, invoice.depositVnd);
  if (open && request.amountVnd > 0n) {
    effects.clawback = commissionClawback({
      refundVnd: request.amountVnd,
      percent,
      lines: invoice.lines,
      discountVnd: totals.discount,
      ...(request.lineId ? { lineId: request.lineId } : {}),
      periods: world.money.periods,
    }).entries.filter((e) => e.amountVnd !== 0n);
  }
  // BR-26, BR-40: a session given back takes back the commission it earned.
  const line = invoice.lines.find((l) => l.id === request.lineId);
  if (open && request.returnSession && line?.staffResourceId && line.sessionRevenueVnd) {
    const back = -((line.sessionRevenueVnd * BigInt(percent)) / 100n);
    const found = effects.clawback.find((e) => e.staffResourceId === line.staffResourceId);
    if (found) found.amountVnd += back;
    else effects.clawback.push({ staffResourceId: line.staffResourceId, amountVnd: back });
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
  const effects = approvalEffects(world, request, ctx.commissionPercent);

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
  const period = world.money.periods.find((p) => p.status === 'open');
  const commission: CommissionEntry[] = period
    ? effects.clawback.map((e) => ({
        id: `com-${request.id}-${e.staffResourceId}`,
        staffResourceId: e.staffResourceId,
        periodId: period.id,
        amountVnd: e.amountVnd,
        invoiceId: invoice.id,
        kind: 'clawback' as const,
        at: ctx.now,
      }))
    : [];

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

  return {
    world: {
      ...world,
      customers,
      money: {
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
        commission: [...world.money.commission, ...commission],
        audit: [
          ...world.money.audit,
          {
            id: `au-${request.id}-approve`,
            at: ctx.now,
            by: ctx.actor,
            text: `Duyệt hoàn ${formatVnd(request.amountVnd)} cho ${invoice.number}`,
          },
        ],
      },
    },
    error: null,
  };
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
        audit: [
          ...world.money.audit,
          {
            id: `au-${request.id}-reject`,
            at: ctx.now,
            by: ctx.actor,
            text: `Từ chối hoàn ${formatVnd(request.amountVnd)} cho ${invoice?.number ?? request.what}: ${note.trim()}`,
          },
        ],
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
  return { ...money, refunds: [...money.refunds, request] };
}
