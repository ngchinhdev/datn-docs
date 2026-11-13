/*
 * What happens to the money data when something is done at the desk: collect an invoice, sell a
 * package, top up a wallet, ask for a refund and decide it (BR-20 to BR-29, BR-42). Each function
 * takes the world and returns the next one; nothing is changed in place, and the clock and the
 * actor come in as arguments. Pure, so Node can run it (scripts/check-money.ts).
 */
import { addAudit, addAudits, type Actor, type AuditInput } from './audit.ts';
import type {
  Appointment,
  CommissionEntry,
  Customer,
  CustomerPackage,
  Invoice,
  InvoiceLine,
  MoneyState,
  PackageProduct,
  Payment,
  PaymentMethod,
  PlannedPayment,
  RefundRequest,
  Service,
  WalletEntry,
} from './fixtures/types.ts';
import { formatVnd } from './format.ts';
import {
  commissionEarned,
  draftInvoice,
  invoiceTotals,
  nextInvoiceNumber,
  packageExpiry,
  packageSessionCommission,
  packageUsable,
  refundable,
  sessionRevenue,
  splitWallet,
  walletBalance,
  type StaffAmount,
} from './money.ts';

/** Everything an action can change at once: money, the customers' packages, the appointments. */
export interface World {
  money: MoneyState;
  customers: Customer[];
  appointments: Appointment[];
}

export interface Ctx {
  services: Service[];
  catalog: PackageProduct[];
  /** Percent of the commission rule (BR-40). */
  commissionPercent: number;
  /** ISO 8601, UTC. */
  now: string;
  /** Who does it: "Lan", "Hùng". */
  actor: string;
  /** The role they act in, for the audit log: "Lễ tân", "Chủ cơ sở". */
  role: string;
}

/** The person of a context, as the audit log writes them. */
const whoIs = (ctx: Ctx): Actor => ({ name: ctx.actor, role: ctx.role });

const PREFIX: Record<PaymentMethod, string> = {
  cash: 'CS',
  transfer: 'TF',
  card: 'CD',
  wallet: 'WL',
  gateway: 'PG',
};

export const METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: 'Tiền mặt',
  transfer: 'Chuyển khoản',
  card: 'Thẻ',
  wallet: 'Ví',
  gateway: 'Cọc qua cổng (giả lập)',
};

/** Adds the amounts of the same person together. */
const mergeStaff = (...lists: StaffAmount[][]): StaffAmount[] => {
  const out: StaffAmount[] = [];
  for (const e of lists.flat()) {
    const found = out.find((x) => x.staffResourceId === e.staffResourceId);
    if (found) found.amountVnd += e.amountVnd;
    else out.push({ ...e });
  }
  return out;
};

const digits = (text: string) => text.replace(/\D/g, '');

/** An invoice is locked once it is collected, and while a transfer is waiting (BR-21). */
export const isLocked = (invoice: Invoice, payments: readonly Payment[]) =>
  Boolean(invoice.paidAt) ||
  payments.some(
    (p) => p.invoiceId === invoice.id && p.purpose === 'invoice' && p.status === 'pending',
  );

const mapInvoice = (money: MoneyState, id: string, fn: (i: Invoice) => Invoice): MoneyState => ({
  ...money,
  invoices: money.invoices.map((i) => (i.id === id ? fn(i) : i)),
});

/** The draft an appointment gets when it is done; one per appointment. */
export function ensureDraft(world: World, appt: Appointment, ctx: Ctx): World {
  if (world.money.invoices.some((i) => i.appointmentId === appt.id)) return world;
  const draft = draftInvoice(appt, ctx.services, nextInvoiceNumber(world.money.invoices), ctx.now);
  return {
    ...world,
    money: {
      ...world.money,
      invoices: [...world.money.invoices, draft.invoice],
      payments: [...world.money.payments, ...draft.payments],
    },
  };
}

/** A draft of its own (selling a package or a top-up), not tied to an appointment. */
export function newDraft(
  world: World,
  input: { customerId: string; lines: Omit<InvoiceLine, 'id'>[] },
  ctx: Ctx,
): { world: World; invoice: Invoice } {
  const number = nextInvoiceNumber(world.money.invoices);
  const id = `inv-${digits(number)}`;
  const invoice: Invoice = {
    id,
    number,
    customerId: input.customerId,
    createdAt: ctx.now,
    lines: input.lines.map((l, i) => ({ ...l, id: `${id}-l${i}` })),
    depositVnd: 0n,
  };
  return {
    world: { ...world, money: { ...world.money, invoices: [...world.money.invoices, invoice] } },
    invoice,
  };
}

/** Edits a draft; a locked invoice is left as it is (BR-21). */
export function editInvoice(world: World, id: string, fn: (i: Invoice) => Invoice): World {
  const invoice = world.money.invoices.find((i) => i.id === id);
  if (!invoice || isLocked(invoice, world.money.payments)) return world;
  return { ...world, money: mapInvoice(world.money, id, fn) };
}

export type CollectOutcome =
  | { kind: 'paid'; world: World }
  | { kind: 'awaiting'; world: World }
  | { kind: 'duplicate'; world: World }
  | { kind: 'error'; world: World; message: string };

/** The reason a plan cannot be collected, or `null` (BR-21, BR-25). */
export function planProblem(
  world: World,
  invoice: Invoice,
  plan: readonly PlannedPayment[],
): string | null {
  const totals = invoiceTotals(invoice.lines, invoice.discount, invoice.depositVnd);
  const paid = plan.reduce((m, p) => m + p.amountVnd, 0n);
  if (paid !== totals.due) return 'Tổng các khoản chưa đúng số còn phải thu.';
  if (new Set(plan.map((p) => p.method)).size !== plan.length)
    return 'Mỗi phương thức chỉ một khoản.';
  for (const p of plan) {
    if (p.amountVnd <= 0n) return 'Mỗi khoản phải lớn hơn 0.';
    if (p.method === 'cash' && (p.tenderedVnd ?? p.amountVnd) < p.amountVnd) {
      return 'Khách đưa chưa đủ tiền mặt.';
    }
    if (p.method === 'wallet') {
      if (!invoice.customerId) return 'Khách lẻ không có ví.';
      const b = walletBalance(world.money.walletEntries, invoice.customerId);
      if (p.amountVnd > b.balanceVnd) return 'Số dư ví không đủ.';
    }
  }
  const customer = world.customers.find((c) => c.id === invoice.customerId);
  const used = new Map<string, number>();
  for (const l of invoice.lines)
    if (l.packageId) used.set(l.packageId, (used.get(l.packageId) ?? 0) + 1);
  for (const [packageId, count] of used) {
    const pkg = customer?.packages?.find((x) => x.id === packageId);
    if (!pkg || pkg.remainingSessions < count) return 'Gói không còn đủ buổi.';
  }
  return null;
}

function finalize(
  world: World,
  invoiceId: string,
  plan: readonly PlannedPayment[],
  ctx: Ctx,
): World {
  const invoice = world.money.invoices.find((i) => i.id === invoiceId)!;
  const totals = invoiceTotals(invoice.lines, invoice.discount, invoice.depositVnd);
  const no = digits(invoice.number);
  let { money, customers, appointments } = world;

  const payments: Payment[] = [];
  const entries: WalletEntry[] = [];
  for (const p of plan) {
    const key = `collect:${invoice.id}:${p.method}`;
    if (money.payments.some((x) => x.idempotencyKey === key)) continue;
    let split: { realVnd: bigint; bonusVnd: bigint } | undefined;
    if (p.method === 'wallet' && invoice.customerId) {
      const b = walletBalance([...money.walletEntries, ...entries], invoice.customerId);
      split = splitWallet(p.amountVnd, b.realVnd, b.bonusVnd);
      entries.push({
        id: `wl-${invoice.id}-pay`,
        customerId: invoice.customerId,
        at: ctx.now,
        realVnd: -split.realVnd,
        bonusVnd: -split.bonusVnd,
        kind: 'payment',
        memo: `Trả ${invoice.number}`,
        invoiceId: invoice.id,
        idempotencyKey: `wl:${invoice.id}:pay`,
      });
    }
    payments.push({
      id: `pay-${no}-${p.method}`,
      invoiceId: invoice.id,
      purpose: 'invoice',
      method: p.method,
      amountVnd: p.amountVnd,
      ...(p.method === 'cash' ? { tenderedVnd: p.tenderedVnd ?? p.amountVnd } : {}),
      ...(split ? { realVnd: split.realVnd, bonusVnd: split.bonusVnd } : {}),
      code: `${PREFIX[p.method]}-${no}`,
      at: ctx.now,
      status: 'paid',
      idempotencyKey: key,
    });
  }

  // What the lines do beyond the money: sessions used, a package sold, a wallet topped up.
  const customer = customers.find((c) => c.id === invoice.customerId);
  let packages = customer?.packages ?? [];
  // BR-26: each package session earns its share of the package price when it is used.
  const taken = new Map<string, number>();
  const lines = invoice.lines.map((l) => {
    const pkg = l.packageId ? customer?.packages?.find((p) => p.id === l.packageId) : undefined;
    if (!pkg?.priceVnd) return l;
    const nth = (taken.get(pkg.id) ?? pkg.usedSessions) + 1;
    taken.set(pkg.id, nth);
    return { ...l, sessionRevenueVnd: sessionRevenue(pkg.priceVnd, pkg.totalSessions, nth) };
  });
  for (const l of invoice.lines) {
    if (l.packageId) {
      packages = packages.map((p) =>
        p.id === l.packageId
          ? { ...p, usedSessions: p.usedSessions + 1, remainingSessions: p.remainingSessions - 1 }
          : p,
      );
    }
    if (l.kind === 'package_sale' && l.productId) {
      const product = ctx.catalog.find((x) => x.id === l.productId);
      const variant = ctx.services
        .flatMap((s) => s.variants)
        .find((v) => v.id === product?.serviceVariantId);
      if (product && variant) {
        const bought: CustomerPackage = {
          id: `pkg-${no}`,
          name: product.name,
          totalSessions: product.totalSessions,
          usedSessions: 0,
          remainingSessions: product.totalSessions,
          expiresAt: packageExpiry(ctx.now, product.validDays),
          serviceVariantId: product.serviceVariantId,
          priceVnd: l.unitPriceVnd,
          unitPriceVnd: variant.priceVnd,
          productId: product.id,
        };
        packages = [...packages, bought];
      }
    }
    if (l.kind === 'wallet_topup' && invoice.customerId) {
      entries.push({
        id: `wl-${invoice.id}-topup`,
        customerId: invoice.customerId,
        at: ctx.now,
        realVnd: l.unitPriceVnd,
        bonusVnd: l.bonusVnd ?? 0n,
        kind: 'topup',
        memo: `Nạp ví ${invoice.number}${(l.bonusVnd ?? 0n) > 0n ? `, tặng ${formatVnd(l.bonusVnd ?? 0n)}` : ''}`,
        invoiceId: invoice.id,
        idempotencyKey: `topup:${invoice.id}`,
      });
    }
  }
  // BR-22: a deposit bigger than the invoice is real money the customer can take out of the wallet.
  if (totals.depositUnused > 0n && invoice.customerId) {
    entries.push({
      id: `wl-${invoice.id}-deposit-excess`,
      customerId: invoice.customerId,
      at: ctx.now,
      realVnd: totals.depositUnused,
      bonusVnd: 0n,
      kind: 'deposit_excess',
      memo: `Cọc thừa ${invoice.number} chuyển vào ví`,
      invoiceId: invoice.id,
      idempotencyKey: `deposit-excess:${invoice.id}`,
    });
  }
  if (customer && packages !== customer.packages) {
    customers = customers.map((c) => (c.id === customer.id ? { ...c, packages } : c));
  }

  if (invoice.appointmentId) {
    appointments = appointments.map((a) =>
      a.id === invoice.appointmentId ? { ...a, status: 'completed', settled: true } : a,
    );
  }

  // BR-40, BR-42: commission on what was really collected, in the open period.
  const period = money.periods.find((p) => p.status === 'open');
  const commission: CommissionEntry[] = period
    ? mergeStaff(
        commissionEarned(lines, totals.discount, ctx.commissionPercent),
        packageSessionCommission(lines, ctx.commissionPercent),
      ).map((e) => ({
        id: `com-${invoice.id}-${e.staffResourceId}`,
        staffResourceId: e.staffResourceId,
        periodId: period.id,
        amountVnd: e.amountVnd,
        invoiceId: invoice.id,
        kind: 'earn',
        at: ctx.now,
      }))
    : [];

  // BR-63: collecting and a hand discount are logged.
  const collected = plan
    .map((p) => `${(METHOD_LABEL[p.method] ?? p.method).toLowerCase()} ${formatVnd(p.amountVnd)}`)
    .join(', ');
  const auditInputs: AuditInput[] = [
    {
      action: 'Thu tiền',
      object: invoice.number,
      href: `invoices/${invoice.id}`,
      detail: `${formatVnd(totals.due)}${collected ? `: ${collected}` : ''}`,
    },
    ...(invoice.discount
      ? [
          {
            action: 'Giảm giá',
            object: invoice.number,
            href: `invoices/${invoice.id}`,
            detail: `${
              invoice.discount.kind === 'percent'
                ? `${invoice.discount.percent}%`
                : formatVnd(invoice.discount.amountVnd)
            } · ${invoice.discount.reason}`,
          },
        ]
      : []),
  ];

  money = {
    ...money,
    invoices: money.invoices.map((i) => {
      if (i.id !== invoice.id) return i;
      const { held: _held, ...rest } = i;
      return { ...rest, lines, paidAt: ctx.now, collectedBy: ctx.actor };
    }),
    payments: [
      ...money.payments.map((p) =>
        p.invoiceId === invoice.id && p.status === 'pending'
          ? { ...p, status: 'paid' as const }
          : p,
      ),
      ...payments,
    ],
    walletEntries: [...money.walletEntries, ...entries],
    commission: [...money.commission, ...commission],
    audit: addAudits(money.audit, ctx.now, whoIs(ctx), auditInputs),
  };
  return { money, customers, appointments };
}

/**
 * BR-21: records the payments of an invoice. Pressing twice records once: a collected invoice is
 * returned as it is. With a transfer in the plan the transfer waits for the bank and the rest is
 * recorded when it arrives.
 */
export function collect(
  world: World,
  invoiceId: string,
  plan: readonly PlannedPayment[],
  ctx: Ctx,
): CollectOutcome {
  const invoice = world.money.invoices.find((i) => i.id === invoiceId);
  if (!invoice) return { kind: 'error', world, message: 'Không tìm thấy hóa đơn.' };
  if (isLocked(invoice, world.money.payments)) return { kind: 'duplicate', world };
  const problem = planProblem(world, invoice, plan);
  if (problem) return { kind: 'error', world, message: problem };

  const transfer = plan.find((p) => p.method === 'transfer');
  if (!transfer) return { kind: 'paid', world: finalize(world, invoiceId, plan, ctx) };

  const no = digits(invoice.number);
  const pending: Payment = {
    id: `pay-${no}-transfer`,
    invoiceId,
    purpose: 'invoice',
    method: 'transfer',
    amountVnd: transfer.amountVnd,
    code: `${PREFIX.transfer}-${no}`,
    at: ctx.now,
    status: 'pending',
    idempotencyKey: `collect:${invoiceId}:transfer`,
  };
  const others = plan.filter((p) => p.method !== 'transfer');
  return {
    kind: 'awaiting',
    world: {
      ...world,
      money: {
        ...mapInvoice(world.money, invoiceId, (i) => ({ ...i, held: others })),
        payments: [...world.money.payments, pending],
      },
    },
  };
}

/** The bank reports the transfer; a second report changes nothing (BR-21). */
export function confirmTransfer(world: World, invoiceId: string, ctx: Ctx): CollectOutcome {
  const invoice = world.money.invoices.find((i) => i.id === invoiceId);
  const waiting = world.money.payments.find(
    (p) => p.invoiceId === invoiceId && p.method === 'transfer' && p.status === 'pending',
  );
  if (!invoice || !waiting) return { kind: 'duplicate', world };
  const plan: PlannedPayment[] = [
    ...(invoice.held ?? []),
    { method: 'transfer', amountVnd: waiting.amountVnd },
  ];
  // The transfer is already a payment; the others are recorded now.
  return { kind: 'paid', world: finalize(world, invoiceId, plan, ctx) };
}

/** "Đổi phương thức": the code is dropped and the invoice can be edited again. */
export function cancelTransfer(world: World, invoiceId: string): World {
  return {
    ...world,
    money: {
      ...mapInvoice(world.money, invoiceId, (i) => {
        const { held: _held, ...rest } = i;
        return rest;
      }),
      payments: world.money.payments.filter(
        (p) => !(p.invoiceId === invoiceId && p.method === 'transfer' && p.status === 'pending'),
      ),
    },
  };
}

/** A package of the customer that can take a session of this service now (BR-26). */
export function usablePackage(customer: Customer | undefined, variantId: string, now: string) {
  return customer?.packages?.find((p) => packageUsable(p, variantId, now));
}

export interface RefundInput {
  invoiceId: string;
  paymentId: string;
  amountVnd: bigint;
  reason: string;
  /** The invoice line the refund is about. */
  lineId?: string;
  /** A package sale being given back, and the fee taken off (BR-27). */
  packageId?: string;
  feeVnd?: bigint;
}

/**
 * BR-28: a request to give money back from one payment. It needs a reason and cannot be more than
 * the payment still holds; the manager decides it later. A line that used a package session
 * asks for the session back and may carry no money.
 */
export function requestRefund(
  world: World,
  input: RefundInput,
  ctx: Ctx,
): { world: World; error: string | null } {
  const invoice = world.money.invoices.find((i) => i.id === input.invoiceId);
  const payment = world.money.payments.find(
    (p) => p.id === input.paymentId && p.invoiceId === input.invoiceId,
  );
  if (!invoice || !payment || !invoice.paidAt) {
    return { world, error: 'Chỉ hóa đơn đã thu mới hoàn tiền được.' };
  }
  if (input.reason.trim() === '') return { world, error: 'Lý do là bắt buộc.' };
  const line = invoice.lines.find((l) => l.id === input.lineId);
  const returnSession = Boolean(line?.packageId);
  const limit = refundable(invoice, payment, world.money.refunds);
  if (input.amountVnd < 0n || (input.amountVnd === 0n && !returnSession)) {
    return { world, error: 'Nhập số tiền lớn hơn 0.' };
  }
  if (input.amountVnd > limit.maxVnd) {
    return { world, error: limit.blocked ?? `Tối đa ${formatVnd(limit.maxVnd)}.` };
  }

  const customer = world.customers.find((c) => c.id === invoice.customerId);
  const pkg = input.packageId
    ? customer?.packages?.find((p) => p.id === input.packageId)
    : undefined;
  const sameInvoice = world.money.refunds.filter((r) => r.invoiceId === invoice.id).length;
  const base = (line?.description ?? invoice.lines[0]?.description ?? '').split(' · ')[0];
  const request: RefundRequest = {
    id: `rf-${digits(invoice.number)}-${sameInvoice + 1}`,
    invoiceId: invoice.id,
    paymentId: payment.id,
    customerId: invoice.customerId,
    who: customer?.callName ?? invoice.customerName ?? 'Khách lẻ',
    what: pkg
      ? `${invoice.number} · ${pkg.name}, dùng ${pkg.usedSessions}`
      : `${invoice.number} · ${base}`,
    amountVnd: input.amountVnd,
    method: payment.method,
    reason: input.reason.trim(),
    createdBy: ctx.actor,
    createdAt: ctx.now,
    status: 'pending',
    ...(input.lineId ? { lineId: input.lineId } : {}),
    ...(input.packageId ? { packageId: input.packageId } : {}),
    ...(input.feeVnd !== undefined ? { feeVnd: input.feeVnd } : {}),
    ...(returnSession ? { returnSession: true } : {}),
  };
  return {
    world: {
      ...world,
      money: {
        ...world.money,
        refunds: [...world.money.refunds, request],
        audit: addAudit(world.money.audit, ctx.now, whoIs(ctx), {
          action: 'Tạo yêu cầu hoàn',
          object: invoice.number,
          href: `invoices/${invoice.id}`,
          detail: `${formatVnd(request.amountVnd)} ${(METHOD_LABEL[request.method] ?? '').toLowerCase()} · ${request.reason}`,
        }),
      },
    },
    error: null,
  };
}

/**
 * BR-25: taking money out of the wallet gives back the real money that is left, never the bonus.
 * The entry is written like any other (BR-20) and the action goes to the log (BR-63).
 */
export function withdrawReal(world: World, customerId: string, ctx: Ctx): World {
  const { realVnd } = walletBalance(world.money.walletEntries, customerId);
  if (realVnd <= 0n) return world;
  const n = world.money.walletEntries.filter(
    (e) => e.customerId === customerId && e.kind === 'withdraw',
  ).length;
  const entry: WalletEntry = {
    id: `wl-${customerId}-withdraw-${n + 1}`,
    customerId,
    at: ctx.now,
    realVnd: -realVnd,
    bonusVnd: 0n,
    kind: 'withdraw',
    memo: 'Rút tiền thật',
    idempotencyKey: `withdraw:${customerId}:${n + 1}`,
  };
  const customer = world.customers.find((c) => c.id === customerId);
  return {
    ...world,
    money: {
      ...world.money,
      walletEntries: [...world.money.walletEntries, entry],
      audit: addAudit(world.money.audit, ctx.now, whoIs(ctx), {
        action: 'Rút tiền ví',
        object: customer?.name ?? customerId,
        href: `customers/${customerId}`,
        detail: `${formatVnd(realVnd)} tiền thật`,
      }),
    },
  };
}
