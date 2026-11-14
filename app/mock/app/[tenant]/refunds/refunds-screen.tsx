'use client';

import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useAppHref } from '@/components/mock/use-app-href';
import { useDesk } from '@/components/mock/use-desk';
import { useQueryState } from '@/components/mock/use-query-state';
import { Button } from '@/components/sapio/button';
import { DataTable, type Column } from '@/components/sapio/data-table';
import { FilterChip } from '@/components/sapio/filters';
import { Field } from '@/components/sapio/form';
import { PageHeader } from '@/components/sapio/page-header';
import { SidePanel } from '@/components/sapio/side-panel';
import { useToast } from '@/components/sapio/toast';
import { useMediaQuery } from '@/components/sapio/use-media-query';
import { cn } from '@/lib/utils';
import type { RefundRequest } from '@/mock/fixtures';
import { formatVnd } from '@/mock/format';
import { formatInvoiceTime } from '@/mock/invoice-view';
import { invoiceStatusLabel } from '@/mock/money';
import { METHOD_LABEL } from '@/mock/money-ops';
import { approvalEffects, approveRefund, rejectRefund } from '@/mock/money-refunds';
import { lookups } from '@/mock/reception';
import { addDays, formatDateTime, localDate, MOCK_NOW } from '@/mock/time';

const BADGE: Record<RefundRequest['status'], [string, string]> = {
  pending: ['pending', 'Chờ duyệt'],
  approved: ['completed', 'Đã duyệt'],
  rejected: ['cancelled', 'Từ chối'],
  auto: ['completed', 'Đã hoàn'],
};
const methodText = (r: RefundRequest) => (r.method === 'wallet' ? 'Ví' : METHOD_LABEL[r.method]);
const PERIOD_DAYS = 30;

/** Hoàn tiền (MH-34): requests for money back; a manager approves from the panel (BR-28). */
export function RefundsScreen({ tenantSlug }: { tenantSlug: string }) {
  const desk = useDesk(tenantSlug);
  const { fixture, world, apply, ctx, role, canManage } = desk;
  const appHref = useAppHref(tenantSlug);
  const toast = useToast();
  const fill = useMediaQuery('(min-width: 768px)');
  const L = useMemo(() => lookups(fixture), [fixture]);
  const [view, setView] = useQueryState('view', 'pending');
  const [openId, setOpenId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const all = [...world.money.refunds].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const pending = all.filter((r) => r.status === 'pending');
  const since = addDays(localDate(MOCK_NOW), -PERIOD_DAYS);
  const rows = view === 'pending' ? pending : all.filter((r) => localDate(r.createdAt) >= since);
  const open = all.find((r) => r.id === openId) ?? null;

  const badge = (r: RefundRequest) => (
    <span className={`sp-badge sp-badge--${BADGE[r.status][0]}`}>{BADGE[r.status][1]}</span>
  );
  const invoiceHref = (r: RefundRequest) =>
    r.invoiceId ? appHref(`invoices/${r.invoiceId}`) : null;

  const columns: Column<RefundRequest>[] = [
    {
      key: 'at',
      width: '12%',
      label: 'Lúc tạo',
      cell: (r) => <span className="sp-num">{formatInvoiceTime(r.createdAt)}</span>,
    },
    {
      key: 'who',
      width: '22%',
      label: 'Khách, hóa đơn',
      cell: (r) => (
        <div className="sp-table__primary">
          <span className="min-w-0">
            {r.customerId ? (
              <Link href={appHref(`customers/${r.customerId}`)}>{r.who}</Link>
            ) : (
              r.who
            )}
            <span className="sp-table__secondary">{r.what}</span>
          </span>
        </div>
      ),
    },
    {
      key: 'amount',
      width: '11%',
      label: 'Số tiền',
      numeric: true,
      cell: (r) => <span className="sp-num">{formatVnd(r.amountVnd)}</span>,
    },
    { key: 'method', width: '11%', label: 'Hoàn về', cell: methodText },
    { key: 'reason', width: '22%', label: 'Lý do', cell: (r) => r.reason },
    { key: 'by', width: '9%', label: 'Người tạo', cell: (r) => r.createdBy },
    { key: 'status', width: '13%', label: 'Trạng thái', cell: badge },
  ];

  function close() {
    setOpenId(null);
    setNote('');
    setError(null);
  }

  function approve(r: RefundRequest) {
    const result = approveRefund(world, r.id, ctx());
    if (result.error) return setError(result.error);
    apply(() => result.world);
    toast({ text: `Đã duyệt hoàn ${formatVnd(r.amountVnd)} cho ${r.who}.` });
    close();
  }
  function reject(r: RefundRequest) {
    const result = rejectRefund(world, r.id, note, ctx());
    if (result.error) return setError(result.error);
    apply(() => result.world);
    toast({ text: `Đã từ chối yêu cầu hoàn của ${r.who}.` });
    close();
  }

  function panel(r: RefundRequest) {
    const payment = world.money.payments.find((p) => p.id === r.paymentId);
    const invoice = world.money.invoices.find((i) => i.id === r.invoiceId);
    const before = world.money.refunds
      .filter(
        (x) =>
          x.paymentId === r.paymentId &&
          x.id !== r.id &&
          (x.status === 'approved' || x.status === 'auto'),
      )
      .reduce((m, x) => m + x.amountVnd, 0n);
    const fx = r.status === 'pending' ? approvalEffects(world, r, ctx()) : null;
    const decidable = r.status === 'pending' && canManage;
    return (
      <SidePanel
        title={`Hoàn ${formatVnd(r.amountVnd)} cho ${r.who}?`}
        onClose={close}
        footer={
          decidable ? (
            <>
              <Button onClick={() => reject(r)}>Từ chối</Button>
              <Button variant="primary" onClick={() => approve(r)}>
                Duyệt, hoàn {formatVnd(r.amountVnd)}
              </Button>
            </>
          ) : undefined
        }
      >
        <dl className="sp-kv">
          <dt>Hóa đơn</dt>
          <dd className="sp-num">
            {invoice ? <Link href={invoiceHref(r)!}>{r.what}</Link> : r.what}
          </dd>
          {payment && (
            <>
              <dt>Đã thu</dt>
              <dd className="sp-num">
                {formatVnd(payment.amountVnd)}{' '}
                {methodText({ ...r, method: payment.method }).toLowerCase()}
              </dd>
              <dt>Đã hoàn trước đó</dt>
              <dd className="sp-num">{formatVnd(before)}</dd>
            </>
          )}
          <dt>Hoàn về</dt>
          <dd className="sp-num">
            {r.method === 'wallet' ? 'Ví' : methodText(r)}
            {r.status === 'auto' ? '' : ', như lúc trả'}
          </dd>
          <dt>{r.createdBy} tạo</dt>
          <dd className="sp-num">{formatDateTime(r.createdAt)}</dd>
        </dl>
        <div className="sp-field sp-field--sm">
          <span className="sp-field__label">Lý do</span>
          <p className="m-0 text-sm leading-5">{r.reason}</p>
        </div>

        {fx && (
          <section
            aria-labelledby="rf-e"
            className="flex flex-col gap-[6px] rounded-(--radius-md) bg-(--fill-tonal) px-[14px] py-3"
          >
            <h3 id="rf-e" className="m-0 text-sm leading-5 font-semibold">
              Duyệt thì
            </h3>
            <ul className="m-0 flex list-disc flex-col gap-1 pl-[18px] text-sm leading-5">
              <li>
                {r.amountVnd > 0n
                  ? `Ghi bút toán đảo ${formatVnd(r.amountVnd)}, hóa đơn thành "${
                      invoiceStatusLabel[fx.status ?? 'refunded']
                    }".`
                  : 'Không trả tiền.'}
              </li>
              {fx.wallet && (
                <li>
                  Ví nhận lại {formatVnd(fx.wallet.realVnd)} tiền thật,{' '}
                  {formatVnd(fx.wallet.bonusVnd)} tiền tặng.
                </li>
              )}
              {fx.clawback.map((c) => (
                <li key={c.staffResourceId}>
                  Thu hồi hoa hồng của {L.name(c.staffResourceId)}: −{formatVnd(-c.amountVnd)} vào
                  kỳ {fx.periodLabel} đang mở (BR-42).
                </li>
              ))}
              {fx.returnSession && (
                <li>
                  Trả lại 1 buổi gói cho khách
                  {fx.sessionRevenueVnd
                    ? `, doanh thu buổi đó ${formatVnd(fx.sessionRevenueVnd)} bị đảo (BR-26)`
                    : ''}
                  .
                </li>
              )}
              {fx.packageRefunded && <li>Gói bị hoàn, khách không dùng được nữa (BR-27).</li>}
              <li>Ghi nhật ký thao tác (BR-63).</li>
            </ul>
          </section>
        )}

        {decidable && (
          <Field id="rf-x" label="Ghi chú khi từ chối" help="Bắt buộc nếu từ chối." error={error}>
            <input id="rf-x" value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
        )}
        {r.status === 'pending' && !canManage && (
          <p className="sp-panel__note m-0">Chỉ quản lý và chủ cơ sở duyệt được (BR-28).</p>
        )}
        {r.status === 'auto' && (
          <p className="sp-panel__note m-0">
            Hệ thống tự hoàn đủ khi tiền về muộn và giờ đã có người đặt; không cần quản lý duyệt
            (BR-29).
          </p>
        )}
        {(r.status === 'approved' || r.status === 'rejected') && (
          <p className="sp-panel__note m-0">
            {r.decidedBy} {r.status === 'approved' ? 'đã duyệt' : 'đã từ chối'} lúc{' '}
            {r.decidedAt ? formatDateTime(r.decidedAt) : ''}
            {r.rejectNote ? `: ${r.rejectNote}` : '.'}
          </p>
        )}
      </SidePanel>
    );
  }

  if (role === 'technician') {
    return (
      <div className="sp-shell__content">
        <p className="sp-empty m-0">Hoàn tiền do lễ tân, quản lý và chủ cơ sở xem.</p>
      </div>
    );
  }

  return (
    <div
      className={cn('sp-shell__content sp-shell__content--wide', fill && 'sp-shell__content--fill')}
    >
      <PageHeader
        title="Hoàn tiền"
        sub={`${pending.length} yêu cầu chờ duyệt · Chỉ quản lý và chủ cơ sở duyệt được (BR-28)`}
      />
      <div className="sp-toolbar">
        <FilterChip pressed={view === 'pending'} onToggle={() => setView('pending')}>
          Chờ duyệt <span className="sp-chip__value">{pending.length}</span>
        </FilterChip>
        <FilterChip pressed={view === 'recent'} onToggle={() => setView('recent')}>
          {PERIOD_DAYS} ngày gần đây
        </FilterChip>
      </div>
      <div className="flex min-h-0 flex-auto items-start gap-(--space-5)">
        <section className="min-w-0 flex-auto" aria-label="Yêu cầu hoàn tiền">
          {rows.length === 0 ? (
            <p className="sp-empty m-0">
              {view === 'pending'
                ? 'Không có yêu cầu nào chờ duyệt.'
                : `Không có yêu cầu hoàn tiền nào trong ${PERIOD_DAYS} ngày gần đây.`}
            </p>
          ) : (
            <DataTable
              label="Yêu cầu hoàn tiền"
              columns={columns}
              rows={rows}
              rowKey={(r) => r.id}
              onRowOpen={(r) => {
                setOpenId(r.id);
                setNote('');
                setError(null);
              }}
              cards={(r) => (
                <button
                  type="button"
                  className="sp-cards__item w-full text-left"
                  onClick={() => setOpenId(r.id)}
                >
                  <span className="sp-cards__body">
                    <span className="sp-cards__title">
                      {r.who} · {formatVnd(r.amountVnd)}
                    </span>
                    <span className="sp-cards__meta">
                      {formatInvoiceTime(r.createdAt)} · {r.what} · {r.createdBy}
                    </span>
                  </span>
                  {badge(r)}
                  <ChevronRight size={16} aria-hidden="true" className="text-(--ink-muted)" />
                </button>
              )}
              foot={
                <div className="sp-table-foot">
                  <span>{rows.length} yêu cầu</span>
                </div>
              }
              phoneFoot={<p className="sp-table-foot m-0">{rows.length} yêu cầu</p>}
            />
          )}
        </section>
        {open && panel(open)}
      </div>
    </div>
  );
}
