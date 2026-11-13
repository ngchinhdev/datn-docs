'use client';

import Link from 'next/link';
import { useState } from 'react';
import { RefundRequestDialog } from '@/components/mock/refund-request-dialog';
import { useAppHref } from '@/components/mock/use-app-href';
import { useDesk } from '@/components/mock/use-desk';
import { Button } from '@/components/sapio/button';
import { PageHeader } from '@/components/sapio/page-header';
import { useToast } from '@/components/sapio/toast';
import type { Payment, RefundRequest } from '@/mock/fixtures';
import { formatVnd } from '@/mock/format';
import { formatInvoiceStamp, invoiceHistory } from '@/mock/invoice-view';
import {
  invoiceStatus,
  invoiceStatusBadge,
  invoiceStatusLabel,
  invoiceTotals,
  lineAmount,
  refundable,
} from '@/mock/money';
import { confirmTransfer, METHOD_LABEL, requestRefund } from '@/mock/money-ops';
import { lookups } from '@/mock/reception';
import { formatDateTime, formatTime } from '@/mock/time';

const REFUND_BADGE: Record<RefundRequest['status'], [string, string]> = {
  pending: ['pending', 'Chờ duyệt'],
  approved: ['completed', 'Đã duyệt'],
  rejected: ['cancelled', 'Từ chối'],
  auto: ['completed', 'Đã hoàn'],
};

function methodText(p: Payment): string {
  if (p.method === 'wallet') {
    return `Ví: tiền thật ${formatVnd(p.realVnd ?? 0n)}, tiền tặng ${formatVnd(p.bonusVnd ?? 0n)}`;
  }
  if (p.method === 'cash' && p.tenderedVnd !== undefined && p.tenderedVnd > p.amountVnd) {
    return `Tiền mặt (khách đưa ${formatVnd(p.tenderedVnd)})`;
  }
  const base = METHOD_LABEL[p.method];
  return p.status === 'pending' ? `${base} · chờ tiền về` : base;
}

/** Chi tiết hóa đơn (MH-31): lines, payments with their codes, the history, and the request for a refund. */
export function InvoiceDetail({ tenantSlug, id }: { tenantSlug: string; id: string }) {
  const desk = useDesk(tenantSlug);
  const { fixture, world, apply, ctx, role } = desk;
  const appHref = useAppHref(tenantSlug);
  const toast = useToast();
  const L = lookups(fixture);
  const [refundOpen, setRefundOpen] = useState(false);

  const invoice = world.money.invoices.find((i) => i.id === id);
  if (!invoice) {
    return (
      <div className="sp-shell__content">
        <p className="sp-empty m-0">
          Không tìm thấy hóa đơn này.{' '}
          <Link href={appHref('invoices')} className="font-medium">
            Về danh sách hóa đơn
          </Link>
        </p>
      </div>
    );
  }
  if (role === 'technician') {
    return (
      <div className="sp-shell__content">
        <p className="sp-empty m-0">Hóa đơn do lễ tân, quản lý và chủ cơ sở xem.</p>
      </div>
    );
  }

  const { money } = world;
  const customer = world.customers.find((c) => c.id === invoice.customerId);
  const who = customer?.name ?? invoice.customerName ?? 'Khách lẻ';
  const totals = invoiceTotals(invoice.lines, invoice.discount, invoice.depositVnd);
  const status = invoiceStatus(invoice, money.payments, money.refunds);
  const payments = money.payments
    .filter((p) => p.invoiceId === invoice.id)
    .sort((a, b) => a.at.localeCompare(b.at));
  const refunds = money.refunds.filter((r) => r.invoiceId === invoice.id);
  const history = invoiceHistory(invoice, money, { staff: L.name });
  const appt = world.appointments.find((a) => a.id === invoice.appointmentId);
  const firstService = invoice.lines.find((l) => l.kind === 'service')?.description.split(' · ')[0];
  const canRefund =
    Boolean(invoice.paidAt) &&
    payments.some(
      (p) =>
        refundable(invoice, p, money.refunds).maxVnd > 0n || invoice.lines.some((l) => l.packageId),
    );
  const pendingTransfer = payments.some(
    (p) => p.purpose === 'invoice' && p.method === 'transfer' && p.status === 'pending',
  );
  const excess = money.walletEntries.find(
    (e) => e.invoiceId === invoice.id && e.kind === 'deposit_excess',
  );
  const given = refunds
    .filter((r) => r.status === 'approved' || r.status === 'auto')
    .reduce((m, r) => m + r.amountVnd, 0n);

  const stamp = formatInvoiceStamp(invoice.paidAt ?? invoice.createdAt);
  const sub = [
    stamp,
    invoice.collectedBy ? `${invoice.collectedBy} thu` : null,
    appt ? `Lịch ${formatTime(appt.startAt)}${firstService ? ` ${firstService}` : ''}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  function simulate() {
    const outcome = confirmTransfer(world, invoice!.id, ctx());
    if (outcome.kind !== 'paid') return;
    apply(() => outcome.world);
    toast({ text: `Tiền về. ${invoice!.number} đã thu ${formatVnd(totals.due)}.` });
  }

  return (
    <div className="print-area">
      <PageHeader
        crumbs={[{ label: 'Hóa đơn', href: appHref('invoices') }, { label: invoice.number }]}
        title={`${invoice.number} · ${who}`}
        sub={sub}
        actions={
          <span className="contents print:hidden">
            {!invoice.paidAt && !pendingTransfer && (
              <Link
                href={appHref(`checkout/${invoice.appointmentId ?? invoice.id}`)}
                className="sp-btn sp-btn--primary no-underline"
              >
                Thu tiền
              </Link>
            )}
            {pendingTransfer && (
              <Button variant="primary" onClick={simulate}>
                Giả lập: tiền về
              </Button>
            )}
            {canRefund && <Button onClick={() => setRefundOpen(true)}>Yêu cầu hoàn tiền</Button>}
            <Button variant="ghost" onClick={() => window.print()}>
              In
            </Button>
            <Button
              variant="ghost"
              onClick={() =>
                toast({
                  text: customer?.email
                    ? `Đã gửi hóa đơn ${invoice.number} tới ${customer.email} (giả lập).`
                    : 'Khách chưa có email để gửi.',
                })
              }
            >
              Gửi email
            </Button>
          </span>
        }
      />
      <div className="sp-detail">
        <div className="sp-detail__main flex min-w-0 flex-[1_1_560px] flex-col gap-5">
          <section className="sp-panel" aria-labelledby="iv-l">
            <h2 className="sp-panel__title" id="iv-l">
              Dòng hóa đơn
            </h2>
            <div
              className="sp-table-wrap"
              tabIndex={0}
              role="region"
              aria-label="Các dòng, cuộn được"
            >
              <table className="sp-table">
                <caption className="sp-sr-only">Các dòng</caption>
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
                  </tr>
                </thead>
                <tbody>
                  {invoice.lines.map((l) => (
                    <tr key={l.id}>
                      <td>
                        {l.description}
                        {l.packageId && (
                          <>
                            {' '}
                            <span className="sp-badge sp-badge--confirmed">Gói</span>
                          </>
                        )}
                        {(l.detail || l.sessionRevenueVnd) && (
                          <span className="sp-table__secondary">
                            {[
                              l.detail,
                              l.sessionRevenueVnd
                                ? `doanh thu buổi gói ${formatVnd(l.sessionRevenueVnd)} (BR-26)`
                                : null,
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                          </span>
                        )}
                      </td>
                      <td>{l.staffResourceId ? L.name(l.staffResourceId) : ''}</td>
                      <td className="sp-table__num sp-num">{l.quantity}</td>
                      <td className="sp-table__num sp-num">{formatVnd(l.unitPriceVnd)}</td>
                      <td className="sp-table__num sp-num">{formatVnd(lineAmount(l))}</td>
                    </tr>
                  ))}
                  {totals.discount > 0n && (
                    <tr>
                      <td>
                        Giảm giá
                        <span className="sp-table__secondary">
                          {invoice.discount?.reason} · {invoice.discount?.approvedBy} duyệt
                        </span>
                      </td>
                      <td />
                      <td className="sp-table__num sp-num" />
                      <td className="sp-table__num sp-num" />
                      <td className="sp-table__num sp-num">−{formatVnd(totals.discount)}</td>
                    </tr>
                  )}
                  {totals.depositApplied > 0n && (
                    <tr>
                      <td>
                        Trừ cọc online{' '}
                        {payments.find((p) => p.purpose === 'deposit')
                          ? formatDateTime(payments.find((p) => p.purpose === 'deposit')!.at).slice(
                              0,
                              5,
                            )
                          : ''}
                      </td>
                      <td />
                      <td className="sp-table__num sp-num" />
                      <td className="sp-table__num sp-num" />
                      <td className="sp-table__num sp-num">−{formatVnd(totals.depositApplied)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="sp-panel" aria-labelledby="iv-p">
            <h2 className="sp-panel__title" id="iv-p">
              Thanh toán
            </h2>
            {payments.length === 0 ? (
              <p className="sp-empty m-0">Chưa có khoản nào. Hóa đơn nháp chờ thu tiền.</p>
            ) : (
              <div
                className="sp-table-wrap"
                tabIndex={0}
                role="region"
                aria-label="Các khoản thanh toán, cuộn được"
              >
                <table className="sp-table">
                  <caption className="sp-sr-only">Các khoản thanh toán</caption>
                  <thead>
                    <tr>
                      <th scope="col">Giờ</th>
                      <th scope="col">Phương thức</th>
                      <th scope="col" className="sp-table__num">
                        Số tiền
                      </th>
                      <th scope="col">Mã</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <span className="sp-num">{formatDateTime(p.at)}</span>
                        </td>
                        <td>{methodText(p)}</td>
                        <td className="sp-table__num sp-num">{formatVnd(p.amountVnd)}</td>
                        <td>
                          <span className="sp-num">{p.code}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="sp-panel__note">
              Mỗi khoản có mã riêng; cổng báo hai lần vẫn chỉ ghi một khoản (BR-21).
            </p>
          </section>
        </div>

        <aside className="sp-detail__side flex flex-[0_0_340px] flex-col gap-4" aria-label="Tổng">
          <section className="sp-panel" aria-labelledby="iv-s">
            <div className="flex items-center gap-2">
              <h2 className="sp-panel__title" id="iv-s">
                Tổng
              </h2>
              <span className={`sp-badge sp-badge--${invoiceStatusBadge[status]}`}>
                {invoiceStatusLabel[status]}
              </span>
            </div>
            <dl className="sp-kv">
              <dt>Tạm tính</dt>
              <dd className="sp-num">{formatVnd(totals.subtotal)}</dd>
              {totals.packageUsed > 0n && (
                <>
                  <dt>Dùng gói</dt>
                  <dd className="sp-num">−{formatVnd(totals.packageUsed)}</dd>
                </>
              )}
              <dt>Giảm giá</dt>
              <dd className="sp-num">{formatVnd(totals.discount)}</dd>
              {totals.depositApplied > 0n && (
                <>
                  <dt>Đã cọc</dt>
                  <dd className="sp-num">−{formatVnd(totals.depositApplied)}</dd>
                </>
              )}
              {excess && (
                <>
                  <dt>Cọc thừa</dt>
                  <dd className="sp-num">{formatVnd(excess.realVnd)} chuyển vào ví</dd>
                </>
              )}
              <dt className="border-t border-(--line) pt-2 font-semibold text-(--ink)">
                {invoice.paidAt ? 'Thu tại quầy' : 'Còn phải thu'}
              </dt>
              <dd className="sp-num border-t border-(--line) pt-2 text-[17px] font-bold">
                {formatVnd(totals.due)}
              </dd>
              {given > 0n && (
                <>
                  <dt>Đã hoàn</dt>
                  <dd className="sp-num">−{formatVnd(given)}</dd>
                </>
              )}
            </dl>
          </section>

          {refunds.length > 0 && (
            <section className="sp-panel" aria-labelledby="iv-r">
              <h2 className="sp-panel__title" id="iv-r">
                Hoàn tiền
              </h2>
              <ul className="m-0 flex list-none flex-col gap-2 p-0 text-sm leading-5">
                {refunds.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-2">
                    <span>
                      <span className="sp-num">{formatVnd(r.amountVnd)}</span> ·{' '}
                      {r.method === 'wallet' ? 'Ví' : METHOD_LABEL[r.method]}
                    </span>
                    <span className={`sp-badge sp-badge--${REFUND_BADGE[r.status][0]}`}>
                      {REFUND_BADGE[r.status][1]}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="sp-panel" aria-labelledby="iv-h">
            <h2 className="sp-panel__title" id="iv-h">
              Lịch sử
            </h2>
            <ol className="m-0 flex list-none flex-col gap-[6px] p-0 text-sm leading-5">
              {history.map((h, i) => (
                <li key={`${h.at}-${i}`}>
                  <span className="sp-num">{formatDateTime(h.at)}</span> {h.text}
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </div>

      {refundOpen && (
        <RefundRequestDialog
          open
          invoice={invoice}
          money={money}
          customer={customer}
          onClose={() => setRefundOpen(false)}
          onSubmit={(input) => {
            const result = requestRefund(world, input, ctx());
            if (result.error) return result.error;
            apply(() => result.world);
            toast({ text: `Đã gửi yêu cầu hoàn ${formatVnd(input.amountVnd)} cho quản lý duyệt.` });
            return null;
          }}
        />
      )}
    </div>
  );
}
