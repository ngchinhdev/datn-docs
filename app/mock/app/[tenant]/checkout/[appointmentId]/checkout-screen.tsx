'use client';

import { Banknote, CreditCard, Landmark, Wallet, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useSubscription } from '@/components/mock/subscription-store';
import { TransferQrDialog } from '@/components/mock/transfer-qr-dialog';
import { useAppHref } from '@/components/mock/use-app-href';
import { useDesk } from '@/components/mock/use-desk';
import { Button } from '@/components/sapio/button';
import { Field } from '@/components/sapio/form';
import { PageHeader } from '@/components/sapio/page-header';
import { statusLabel } from '@/components/sapio/status-badge';
import { useToast } from '@/components/sapio/toast';
import type { Invoice, InvoiceLine, PaymentMethod, PlannedPayment } from '@/mock/fixtures';
import { formatPhone, formatVnd } from '@/mock/format';
import {
  invoiceTotals,
  lineAmount,
  parseVnd,
  sessionRevenue,
  settlementGap,
  splitWallet,
  walletBalance,
} from '@/mock/money';
import {
  cancelTransfer,
  collect,
  confirmTransfer,
  editInvoice,
  ensureDraft,
  isLocked,
  METHOD_LABEL,
  usablePackage,
} from '@/mock/money-ops';
import { lookups } from '@/mock/reception';
import { formatDay, formatTime, localDate } from '@/mock/time';

interface Row {
  method: PaymentMethod;
  /** `null`: whatever is left of the amount due; only the last row is ever like that. */
  amount: string | null;
  /** Cash only: what the customer hands over; empty means the exact amount. */
  tendered: string;
}

const number = new Intl.NumberFormat('vi-VN');
const num = (v: bigint) => number.format(v);
const ICON: Record<'wallet' | 'cash' | 'transfer' | 'card', ReactNode> = {
  wallet: <Wallet size={16} aria-hidden="true" />,
  cash: <Banknote size={16} aria-hidden="true" />,
  transfer: <Landmark size={16} aria-hidden="true" />,
  card: <CreditCard size={16} aria-hidden="true" />,
};
const METHODS = ['wallet', 'cash', 'transfer', 'card'] as const;
const max = (a: bigint, b: bigint) => (a > b ? a : b);
const min = (a: bigint, b: bigint) => (a < b ? a : b);

/** Thu tiền (MH-29): the lines of an invoice, a hand discount, and the methods that add up to the amount due. */
export function CheckoutScreen({ tenantSlug, target }: { tenantSlug: string; target: string }) {
  const desk = useDesk(tenantSlug);
  const { can } = useSubscription();
  const { fixture, world, apply, ctx, role, canManage } = desk;
  const router = useRouter();
  const appHref = useAppHref(tenantSlug);
  const toast = useToast();
  const L = useMemo(() => lookups(fixture), [fixture]);

  const byInvoice = target.startsWith('inv-');
  const appt = byInvoice ? undefined : world.appointments.find((a) => a.id === target);
  const invoice = world.money.invoices.find((i) =>
    byInvoice ? i.id === target : i.appointmentId === target,
  );
  const collectible = appt && (appt.status === 'checked_in' || appt.status === 'completed');

  // A done appointment has a draft; make it the first time its checkout opens.
  useEffect(() => {
    if (appt && collectible && !invoice) apply((w) => ensureDraft(w, appt, ctx()));
  }, [appt, collectible, invoice, apply, ctx]);

  const customer = world.customers.find((c) => c.id === invoice?.customerId);
  const payments = world.money.payments.filter((p) => p.invoiceId === invoice?.id);
  const pending = payments.find((p) => p.purpose === 'invoice' && p.status === 'pending');
  const locked = invoice ? isLocked(invoice, world.money.payments) : false;

  // Collected: the invoice page takes over.
  useEffect(() => {
    if (invoice?.paidAt) router.replace(appHref(`invoices/${invoice.id}`));
  }, [invoice?.paidAt, invoice?.id, router, appHref]);

  const [rows, setRows] = useState<Row[]>([]);
  const [qrOpen, setQrOpen] = useState(false);
  const busy = useRef(false);
  // The box opens once for a transfer that was waiting when the page opened.
  const [seenPending, setSeenPending] = useState(false);
  useEffect(() => {
    if (pending && !seenPending) {
      setSeenPending(true);
      setQrOpen(true);
    }
  }, [pending, seenPending]);

  const lines = invoice?.lines ?? [];
  const totals = invoiceTotals(lines, invoice?.discount, invoice?.depositVnd ?? 0n);
  const balance = customer
    ? walletBalance(world.money.walletEntries, customer.id)
    : { realVnd: 0n, bonusVnd: 0n, balanceVnd: 0n };
  const sale = lines.some((l) => l.kind === 'wallet_topup');

  /** The amount of each row: typed, or what is left for the last one (a wallet pays no more than it holds). */
  const amounts = useMemo(() => {
    const explicit = rows.reduce(
      (m, r) => (r.amount === null ? m : m + (parseVnd(r.amount) ?? 0n)),
      0n,
    );
    return rows.map((r) => {
      if (r.amount !== null) return parseVnd(r.amount) ?? 0n;
      const left = max(0n, totals.due - explicit);
      return r.method === 'wallet' ? min(left, balance.balanceVnd) : left;
    });
  }, [rows, totals.due, balance.balanceVnd]);
  const paid = amounts.reduce((m, a) => m + a, 0n);
  const gap = settlementGap(totals.due, paid);

  if (!invoice) {
    return (
      <div className="sp-shell__content">
        <p className="sp-empty m-0">
          {appt && !collectible
            ? 'Lịch này chưa thu tiền được: chỉ lịch đã check-in hoặc hoàn thành mới có hóa đơn.'
            : 'Không tìm thấy hóa đơn này.'}{' '}
          <Link href={appHref('today')} className="font-medium">
            Về Hôm nay
          </Link>
        </p>
      </div>
    );
  }
  if (role === 'technician') {
    return (
      <div className="sp-shell__content">
        <p className="sp-empty m-0">Thu tiền do lễ tân, quản lý và chủ cơ sở làm.</p>
      </div>
    );
  }

  const who = customer?.name ?? invoice.customerName ?? 'Khách lẻ';
  const edit = (fn: (i: Invoice) => Invoice) => apply((w) => editInvoice(w, invoice.id, fn));

  function setLine(id: string, patch: Partial<InvoiceLine>) {
    edit((i) => ({ ...i, lines: i.lines.map((l) => (l.id === id ? { ...l, ...patch } : l)) }));
  }
  /** BR-40: the person who sold a retail line earns on it; "Không ai" leaves it without commission. */
  function setSeller(id: string, staffResourceId: string) {
    edit((i) => ({
      ...i,
      lines: i.lines.map((l) => {
        if (l.id !== id) return l;
        const { staffResourceId: _old, ...rest } = l;
        return staffResourceId ? { ...rest, staffResourceId } : rest;
      }),
    }));
  }
  function removeLine(id: string) {
    edit((i) => ({ ...i, lines: i.lines.filter((l) => l.id !== id) }));
  }
  function addRetail(r: { name: string; quantity: number; unit: bigint }) {
    const staff = appt?.items[0]?.staffResourceId;
    edit((i) => ({
      ...i,
      lines: [
        ...i.lines,
        {
          id: `${i.id}-r${crypto.randomUUID().slice(0, 8)}`,
          kind: 'retail',
          description: r.name,
          detail: 'Bán lẻ, nhập tay',
          quantity: r.quantity,
          unitPriceVnd: r.unit,
          ...(staff ? { staffResourceId: staff } : {}),
        },
      ],
    }));
  }

  function addMethod(method: PaymentMethod) {
    setRows((current) => {
      const frozen = current.map((r, i) => ({ ...r, amount: r.amount ?? num(amounts[i] ?? 0n) }));
      return [...frozen, { method, amount: null, tendered: '' }];
    });
  }
  function removeRow(method: PaymentMethod) {
    setRows((current) => {
      const left = current.filter((r) => r.method !== method);
      return left.map((r, i) => (i === left.length - 1 ? { ...r, amount: null } : r));
    });
  }
  const patchRow = (method: PaymentMethod, patch: Partial<Row>) =>
    setRows((current) => current.map((r) => (r.method === method ? { ...r, ...patch } : r)));

  const discountReasonMissing =
    invoice.discount !== undefined && totals.discount > 0n && invoice.discount.reason.trim() === '';
  const cashShort = rows.some((r, i) => {
    if (r.method !== 'cash' || r.tendered.trim() === '') return false;
    return (parseVnd(r.tendered) ?? 0n) < (amounts[i] ?? 0n);
  });
  const plan: PlannedPayment[] = rows.map((r, i) => ({
    method: r.method,
    amountVnd: amounts[i] ?? 0n,
    ...(r.method === 'cash' && r.tendered.trim() !== ''
      ? { tenderedVnd: parseVnd(r.tendered) ?? 0n }
      : {}),
  }));
  const withTransfer = rows.some((r) => r.method === 'transfer');
  const blocker = discountReasonMissing
    ? 'Nhập lý do giảm giá.'
    : lines.length === 0
      ? 'Hóa đơn chưa có dòng nào.'
      : cashShort
        ? 'Khách đưa chưa đủ tiền mặt.'
        : rows.some((_, i) => (amounts[i] ?? 0n) <= 0n)
          ? 'Mỗi khoản phải lớn hơn 0.'
          : null;
  const ready = gap.kind === 'ok' && !blocker && (totals.due > 0n ? rows.length > 0 : true);

  function submit() {
    if (!invoice || busy.current || !ready) return;
    busy.current = true;
    const outcome = collect(world, invoice.id, plan, ctx());
    if (outcome.kind === 'error') {
      toast({ text: outcome.message, tone: 'danger' });
      busy.current = false;
      return;
    }
    if (outcome.kind === 'duplicate') {
      busy.current = false;
      return;
    }
    apply(() => outcome.world);
    if (outcome.kind === 'awaiting') {
      setSeenPending(true);
      setQrOpen(true);
      busy.current = false;
      return;
    }
    toast({ text: `Đã thu ${formatVnd(totals.due)} cho ${invoice.number}.` });
    router.push(appHref(`invoices/${invoice.id}`));
  }

  function simulate() {
    if (!invoice) return;
    const outcome = confirmTransfer(world, invoice.id, ctx());
    if (outcome.kind !== 'paid') return;
    apply(() => outcome.world);
    desk.logGateway(`Báo ${invoice.number}, ${formatVnd(totals.due)}, đúng chữ ký`);
    setQrOpen(false);
    toast({ text: `Tiền về. ${invoice.number} đã thu ${formatVnd(totals.due)}.` });
    router.push(appHref(`invoices/${invoice.id}`));
  }

  const time = appt ? formatTime(appt.startAt) : '';
  const sub = appt
    ? `${customer ? `${formatPhone(customer.phone)} · ` : ''}Lịch ${time}, ${formatDay(localDate(appt.startAt))} · ${statusLabel[appt.status]}`
    : customer
      ? formatPhone(customer.phone)
      : undefined;
  const crumbs = appt
    ? [{ label: 'Hôm nay', href: appHref('today') }, { label: who }]
    : [{ label: 'Hóa đơn', href: appHref('invoices') }, { label: who }];

  return (
    <>
      <div className="print-area">
        <PageHeader
          crumbs={crumbs}
          title={`Thu tiền · ${who}`}
          {...(sub ? { sub } : {})}
          actions={
            <Button variant="ghost" className="print:hidden" onClick={() => window.print()}>
              In tạm tính
            </Button>
          }
        />
        <div className="sp-detail">
          <div className="sp-detail__main flex min-w-0 flex-[1_1_560px] flex-col gap-5">
            <section className="sp-panel" aria-labelledby="ck-lines">
              <h2 className="sp-panel__title" id="ck-lines">
                Hóa đơn nháp {invoice.number}
              </h2>
              <div
                className="sp-table-wrap"
                tabIndex={0}
                role="region"
                aria-label="Các dòng của hóa đơn, cuộn được"
              >
                <table className="sp-table">
                  <caption className="sp-sr-only">Các dòng của hóa đơn</caption>
                  <thead>
                    <tr>
                      <th scope="col">Dòng</th>
                      <th scope="col">Người làm</th>
                      <th scope="col" className="sp-table__num">
                        SL
                      </th>
                      <th scope="col" className="sp-table__num">
                        Đơn giá
                      </th>
                      <th scope="col" className="sp-table__num">
                        Thành tiền
                      </th>
                      <th scope="col">
                        <span className="sp-sr-only">Thao tác</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line) => {
                      const pkg = line.packageId
                        ? customer?.packages?.find((p) => p.id === line.packageId)
                        : undefined;
                      const usable =
                        line.kind === 'service' && line.serviceVariantId && !locked
                          ? usablePackage(customer, line.serviceVariantId, ctx().now)
                          : undefined;
                      return (
                        <tr key={line.id}>
                          <td>
                            <span className="flex flex-col">
                              <span className="font-medium">
                                {line.description}
                                {line.packageId && (
                                  <>
                                    {' '}
                                    <span className="sp-badge sp-badge--confirmed">Gói</span>
                                  </>
                                )}
                              </span>
                              <span className="sp-table__secondary">
                                {pkg
                                  ? `${line.detail ?? ''} · dùng 1 buổi "${pkg.name}", còn ${pkg.remainingSessions - 1} sau lần này`
                                  : line.detail}
                              </span>
                            </span>
                          </td>
                          <td>
                            {line.kind === 'retail' && !locked ? (
                              <span className="sp-field__control">
                                <select
                                  aria-label={`Người bán ${line.description}`}
                                  value={line.staffResourceId ?? ''}
                                  onChange={(e) => setSeller(line.id, e.target.value)}
                                >
                                  <option value="">Không ai</option>
                                  {fixture.staff.map((s) => (
                                    <option key={s.resourceId} value={s.resourceId}>
                                      {L.name(s.resourceId)}
                                    </option>
                                  ))}
                                </select>
                              </span>
                            ) : line.staffResourceId ? (
                              L.name(line.staffResourceId)
                            ) : line.kind === 'retail' ? (
                              'Không ai'
                            ) : (
                              ''
                            )}
                          </td>
                          <td className="sp-table__num sp-num">{line.quantity}</td>
                          <td className="sp-table__num sp-num">{formatVnd(line.unitPriceVnd)}</td>
                          <td className="sp-table__num sp-num">{formatVnd(lineAmount(line))}</td>
                          <td>
                            {locked ? null : line.packageId ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  const { packageId: _p, ...rest } = line;
                                  edit((i) => ({
                                    ...i,
                                    lines: i.lines.map((l) => (l.id === line.id ? rest : l)),
                                  }));
                                }}
                              >
                                Bỏ dùng gói
                              </Button>
                            ) : usable ? (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => setLine(line.id, { packageId: usable.id })}
                              >
                                Dùng buổi gói
                              </Button>
                            ) : line.kind === 'retail' ? (
                              <button
                                type="button"
                                className="sp-icon-btn"
                                aria-label={`Bỏ dòng ${line.description}`}
                                onClick={() => removeLine(line.id)}
                              >
                                <X size={16} aria-hidden="true" />
                              </button>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {!locked && !sale && <RetailForm onAdd={addRetail} />}
              {lines
                .filter((l) => l.packageId)
                .map((l) => {
                  const pkg = customer?.packages?.find((p) => p.id === l.packageId);
                  return pkg?.priceVnd ? (
                    <p key={l.id} className="sp-panel__note">
                      Buổi gói tính doanh thu khi dùng:{' '}
                      {formatVnd(
                        sessionRevenue(pkg.priceVnd, pkg.totalSessions, pkg.usedSessions + 1),
                      )}{' '}
                      ({formatVnd(pkg.priceVnd)} ÷ {pkg.totalSessions} buổi); hoa hồng của{' '}
                      {l.staffResourceId ? L.name(l.staffResourceId) : 'người làm'} tính trên số này
                      (BR-26, BR-40).
                    </p>
                  ) : null;
                })}
              <p className="sp-panel__note">
                Giá dịch vụ giữ như lúc đặt (BR-12).
                {customer && !lines.some((l) => l.packageId) && !customer.packages?.length
                  ? ' Khách không có gói áp dụng.'
                  : ''}
              </p>
            </section>

            {!sale && (
              <DiscountPanel
                invoice={invoice}
                locked={locked}
                canManage={canManage}
                onChange={(discount) =>
                  edit((i) => {
                    const { discount: _d, ...rest } = i;
                    return discount ? { ...rest, discount } : rest;
                  })
                }
                actor={desk.actor}
              />
            )}
          </div>

          <aside className="sp-detail__side flex-[0_0_380px]" aria-label="Thanh toán">
            <section className="sp-panel gap-1" aria-labelledby="ck-pay">
              <h2 className="sp-panel__title" id="ck-pay">
                Thanh toán
              </h2>
              <dl className="sp-kv">
                <dt>Tạm tính</dt>
                <dd className="sp-num">{formatVnd(totals.subtotal)}</dd>
                {totals.packageUsed > 0n && (
                  <>
                    <dt>Dùng gói</dt>
                    <dd className="sp-num">−{formatVnd(totals.packageUsed)}</dd>
                  </>
                )}
                {!sale && (
                  <>
                    <dt>Giảm giá</dt>
                    <dd className="sp-num">{formatVnd(totals.discount)}</dd>
                  </>
                )}
                {totals.depositApplied > 0n && (
                  <>
                    <dt>Đã cọc online</dt>
                    <dd className="sp-num">−{formatVnd(totals.depositApplied)}</dd>
                  </>
                )}
                {totals.depositUnused > 0n && customer && (
                  <>
                    <dt>Cọc thừa</dt>
                    <dd className="sp-num">{formatVnd(totals.depositUnused)} chuyển vào ví</dd>
                  </>
                )}
                <dt className="border-t border-(--line) pt-2 font-semibold text-(--ink)">
                  Còn phải thu
                </dt>
                <dd className="sp-num border-t border-(--line) pt-2 text-[17px] font-bold">
                  {formatVnd(totals.due)}
                </dd>
              </dl>

              {pending ? (
                <div className="flex flex-col gap-(--space-2) border-t border-(--line) py-3">
                  <p className="sp-num m-0 text-sm leading-5">
                    Chuyển khoản {formatVnd(pending.amountVnd)} đang chờ ngân hàng báo (
                    {pending.code}
                    ).
                  </p>
                  <Button variant="primary" block onClick={() => setQrOpen(true)}>
                    Hiện mã QR
                  </Button>
                </div>
              ) : (
                <>
                  {rows.map((row, i) => {
                    const amount = amounts[i] ?? 0n;
                    const split =
                      row.method === 'wallet'
                        ? splitWallet(amount, balance.realVnd, balance.bonusVnd)
                        : null;
                    const tendered =
                      row.method === 'cash' && row.tendered.trim() !== ''
                        ? (parseVnd(row.tendered) ?? 0n)
                        : null;
                    const label =
                      row.method === 'wallet' ? 'Ví của khách' : METHOD_LABEL[row.method];
                    return (
                      <div
                        key={row.method}
                        className="grid grid-cols-[auto_1fr_auto_auto] items-start gap-[10px] border-t border-(--line) py-3"
                      >
                        <span className="flex size-8 items-center justify-center rounded-lg bg-(--fill-tonal)">
                          {ICON[row.method as keyof typeof ICON]}
                        </span>
                        <span className="flex min-w-0 flex-col gap-[6px]">
                          <span className="text-sm leading-5 font-medium">{label}</span>
                          {row.method === 'wallet' && split && (
                            <span className="sp-num text-[13px] leading-[18px] text-(--ink-muted)">
                              Số dư {formatVnd(balance.balanceVnd)}: trừ tiền thật{' '}
                              {formatVnd(split.realVnd)} trước
                              {split.bonusVnd > 0n
                                ? `, rồi ${formatVnd(split.bonusVnd)} tiền tặng`
                                : ''}
                            </span>
                          )}
                          {row.method === 'transfer' && (
                            <span className="text-[13px] leading-[18px] text-(--ink-muted)">
                              QR có xác nhận tự động
                            </span>
                          )}
                          {row.method === 'card' && (
                            <span className="text-[13px] leading-[18px] text-(--ink-muted)">
                              Chỉ ghi tay, không nối máy quẹt
                            </span>
                          )}
                          {row.method === 'cash' && (
                            <>
                              <Field id={`ck-cash-${i}`} label="Khách đưa" suffix="₫">
                                <input
                                  id={`ck-cash-${i}`}
                                  inputMode="numeric"
                                  placeholder={num(amount)}
                                  value={row.tendered}
                                  onChange={(e) =>
                                    patchRow('cash', {
                                      tendered: e.target.value.replace(/[^\d.]/g, ''),
                                    })
                                  }
                                />
                              </Field>
                              {tendered !== null && tendered >= amount && (
                                <span className="sp-num text-[13px] leading-[18px] text-(--ink-muted)">
                                  Thối lại{' '}
                                  <strong className="text-(--ink)">
                                    {formatVnd(tendered - amount)}
                                  </strong>
                                </span>
                              )}
                            </>
                          )}
                        </span>
                        {rows.length > 1 ? (
                          <span className="sp-field sp-field--sm w-[120px]">
                            <span className="sp-field__control">
                              <input
                                aria-label={`Số tiền ${label}`}
                                inputMode="numeric"
                                value={row.amount ?? num(amount)}
                                onChange={(e) =>
                                  patchRow(row.method, {
                                    amount: e.target.value.replace(/[^\d.]/g, ''),
                                  })
                                }
                              />
                            </span>
                          </span>
                        ) : (
                          <span className="sp-num text-[15px] leading-[22px] font-semibold whitespace-nowrap">
                            {formatVnd(amount)}
                          </span>
                        )}
                        <button
                          type="button"
                          className="sp-icon-btn"
                          aria-label={`Bỏ ${label}`}
                          onClick={() => removeRow(row.method)}
                        >
                          <X size={16} aria-hidden="true" />
                        </button>
                      </div>
                    );
                  })}

                  <div className="flex flex-wrap gap-2 border-t border-(--line) py-3">
                    {METHODS.filter((m) => !rows.some((r) => r.method === m))
                      // Cài đặt › Thanh toán: cash is always on; the others can be turned off.
                      .filter((m) => m === 'cash' || fixture.config.counterMethods[m])
                      .filter(
                        (m) =>
                          m !== 'wallet' ||
                          (can('packages_wallet') && customer && balance.balanceVnd > 0n && !sale),
                      )
                      .map((m) => (
                        <Button key={m} size="sm" onClick={() => addMethod(m)}>
                          {m === 'wallet' ? 'Ví' : METHOD_LABEL[m]}
                        </Button>
                      ))}
                  </div>

                  {rows.length > 0 && (
                    <p
                      role="status"
                      className={`sp-fit ${gap.kind === 'ok' && !blocker ? 'sp-fit--ok' : 'sp-fit--bad'}`}
                    >
                      <span>
                        {blocker
                          ? blocker
                          : gap.kind === 'ok'
                            ? `Đủ ${formatVnd(totals.due)} từ ${rows.length} phương thức.`
                            : gap.kind === 'short'
                              ? `Còn thiếu ${formatVnd(gap.gapVnd)}.`
                              : `Thừa ${formatVnd(gap.gapVnd)}.`}
                      </span>
                    </p>
                  )}
                  <Button
                    variant="primary"
                    size="lg"
                    block
                    className="mt-2"
                    disabled={!ready}
                    onClick={submit}
                  >
                    {withTransfer ? 'Hiện mã QR' : `Thu ${formatVnd(totals.due)}`}
                  </Button>
                </>
              )}
              <p className="sp-panel__note">
                Bấm hai lần vẫn chỉ ghi một khoản (BR-21). Thu xong, hóa đơn khóa; sửa bằng hoàn
                tiền.
              </p>
            </section>
          </aside>
        </div>
      </div>

      {pending && (
        <TransferQrDialog
          open={qrOpen}
          amountVnd={pending.amountVnd}
          code={pending.code}
          createdAt={pending.at}
          receiver={`SAPIO PAY · ${fixture.tenant.name
            .normalize('NFD')
            .replace(/[̀-ͯ]/g, '')
            .replace(/đ/gi, 'd')
            .toUpperCase()}`}
          onSimulate={simulate}
          onChangeMethod={() => {
            apply((w) => cancelTransfer(w, invoice.id));
            setQrOpen(false);
            setRows([]);
          }}
          onClose={() => setQrOpen(false)}
          onWaitInList={() => router.push(appHref('invoices'))}
        />
      )}
    </>
  );
}

/** "Thêm dòng bán lẻ": name, quantity and unit price by hand, no stock (BR-22). */
function RetailForm({
  onAdd,
}: {
  onAdd: (r: { name: string; quantity: number; unit: bigint }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [qty, setQty] = useState('1');
  const [price, setPrice] = useState('');
  const unit = parseVnd(price);
  const quantity = /^\d{1,3}$/.test(qty) ? Number(qty) : 0;
  const valid = name.trim() !== '' && unit !== null && unit > 0n && quantity > 0;

  if (!open) {
    return (
      <div>
        <Button size="sm" onClick={() => setOpen(true)}>
          Thêm dòng bán lẻ
        </Button>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-end gap-3">
      <Field id="rt-name" label="Tên hàng">
        <input id="rt-name" value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <div className="w-20">
        <Field id="rt-qty" label="Số lượng">
          <input
            id="rt-qty"
            inputMode="numeric"
            value={qty}
            onChange={(e) => setQty(e.target.value.replace(/\D/g, ''))}
          />
        </Field>
      </div>
      <div className="w-40">
        <Field id="rt-price" label="Đơn giá" suffix="₫">
          <input
            id="rt-price"
            inputMode="numeric"
            value={price}
            onChange={(e) => setPrice(e.target.value.replace(/[^\d.]/g, ''))}
          />
        </Field>
      </div>
      <Button
        variant="primary"
        disabled={!valid}
        onClick={() => {
          if (!valid || unit === null) return;
          onAdd({ name: name.trim(), quantity, unit });
          setName('');
          setQty('1');
          setPrice('');
          setOpen(false);
        }}
      >
        Thêm
      </Button>
      <Button variant="ghost" onClick={() => setOpen(false)}>
        Hủy
      </Button>
    </div>
  );
}

/** A discount is by hand, with a reason, and only a manager gives it (BR-22). */
function DiscountPanel({
  invoice,
  locked,
  canManage,
  actor,
  onChange,
}: {
  invoice: Invoice;
  locked: boolean;
  canManage: boolean;
  actor: string;
  onChange: (discount: Invoice['discount']) => void;
}) {
  const current = invoice.discount;
  const [kind, setKind] = useState<'percent' | 'amount'>(current?.kind ?? 'percent');
  const [value, setValue] = useState(
    current ? (current.kind === 'percent' ? String(current.percent) : num(current.amountVnd)) : '',
  );
  const [reason, setReason] = useState(current?.reason ?? '');
  const off = locked || !canManage;

  function push(k: 'percent' | 'amount', v: string, r: string) {
    if (v.trim() === '') return onChange(undefined);
    if (k === 'percent') {
      const percent = Math.min(100, Number(v.replace(/\D/g, '')) || 0);
      onChange(
        percent > 0 ? { kind: 'percent', percent, reason: r, approvedBy: actor } : undefined,
      );
    } else {
      const amount = parseVnd(v);
      onChange(
        amount && amount > 0n
          ? { kind: 'amount', amountVnd: amount, reason: r, approvedBy: actor }
          : undefined,
      );
    }
  }

  return (
    <section className="sp-panel" aria-labelledby="ck-disc">
      <h2 className="sp-panel__title" id="ck-disc">
        Giảm giá
      </h2>
      <div className="flex flex-wrap items-end gap-3">
        <div className="sp-field sp-field--sm w-[140px]">
          <label className="sp-field__label" htmlFor="ck-dt">
            Kiểu
          </label>
          <div className="sp-field__control">
            <select
              id="ck-dt"
              disabled={off}
              value={kind}
              onChange={(e) => {
                const k = e.target.value as 'percent' | 'amount';
                setKind(k);
                setValue('');
                onChange(undefined);
              }}
            >
              <option value="percent">Phần trăm</option>
              <option value="amount">Số tiền</option>
            </select>
          </div>
        </div>
        <div className="sp-field sp-field--sm w-[120px]">
          <label className="sp-field__label" htmlFor="ck-dv">
            Mức
          </label>
          <div className="sp-field__control">
            <input
              id="ck-dv"
              inputMode="numeric"
              disabled={off}
              value={value}
              onChange={(e) => {
                const v = e.target.value.replace(/[^\d.]/g, '');
                setValue(v);
                push(kind, v, reason);
              }}
            />
            <span className="sp-field__suffix">{kind === 'percent' ? '%' : '₫'}</span>
          </div>
        </div>
        <div className="sp-field sp-field--sm min-w-[200px] flex-1">
          <label className="sp-field__label" htmlFor="ck-dr">
            Lý do
          </label>
          <div className="sp-field__control">
            <input
              id="ck-dr"
              disabled={off}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                push(kind, value, e.target.value);
              }}
            />
          </div>
        </div>
      </div>
      <p className="sp-panel__note">
        {canManage
          ? 'Giảm giá cần quyền quản lý và lý do; ghi vào nhật ký (BR-63). Tính trước khi trừ cọc.'
          : 'Cần quản lý: giảm giá do quản lý hoặc chủ cơ sở nhập (BR-22).'}
      </p>
    </section>
  );
}
