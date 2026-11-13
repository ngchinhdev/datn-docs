/*
 * What happens to the money data when something is done at the desk: collect an invoice, sell a
 * package, top up a wallet, ask for a refund and decide it (BR-20 to BR-29, BR-42). Each function
 * takes the world and returns the next one; nothing is changed in place, and the clock and the
 * actor come in as arguments. Pure, so Node can run it (scripts/check-money.ts).
 */
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
  packageUsable,
  splitWallet,
  walletBalance,
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
}

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
    ? commissionEarned(invoice.lines, totals.discount, ctx.commissionPercent).map((e) => ({
        id: `com-${invoice.id}-${e.staffResourceId}`,
        staffResourceId: e.staffResourceId,
        periodId: period.id,
        amountVnd: e.amountVnd,
        invoiceId: invoice.id,
        kind: 'earn',
        at: ctx.now,
      }))
    : [];

  const audit = invoice.discount
    ? [
        {
          id: `au-${invoice.id}-discount`,
          at: ctx.now,
          by: ctx.actor,
          text: `Giảm giá ${formatVnd(totals.discount)} cho ${invoice.number}: ${invoice.discount.reason}`,
        },
      ]
    : [];

  money = {
    ...money,
    invoices: money.invoices.map((i) => {
      if (i.id !== invoice.id) return i;
      const { held: _held, ...rest } = i;
      return { ...rest, paidAt: ctx.now, collectedBy: ctx.actor };
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
    audit: [...money.audit, ...audit],
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
