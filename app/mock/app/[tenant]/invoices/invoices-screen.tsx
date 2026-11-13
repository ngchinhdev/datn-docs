'use client';

import { ChevronRight, Download, Plus } from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';
import { useAppHref } from '@/components/mock/use-app-href';
import { useDesk } from '@/components/mock/use-desk';
import { useQueryState } from '@/components/mock/use-query-state';
import { PhoneHeaderAction } from '@/components/sapio/app-shell';
import { Button } from '@/components/sapio/button';
import { DataTable, type Column } from '@/components/sapio/data-table';
import { ChipMenu, FilterChip, SearchField } from '@/components/sapio/filters';
import { PageHeader } from '@/components/sapio/page-header';
import { useToast } from '@/components/sapio/toast';
import { useMediaQuery } from '@/components/sapio/use-media-query';
import { cn } from '@/lib/utils';
import { matchesPerson } from '@/mock/customers';
import { formatVnd } from '@/mock/format';
import { formatInvoiceTime, invoiceRows, type InvoiceRow } from '@/mock/invoice-view';
import { invoiceStatusBadge, invoiceStatusLabel, type InvoiceStatus } from '@/mock/money';
import { METHOD_LABEL } from '@/mock/money-ops';
import { localDate, MOCK_NOW } from '@/mock/time';

const STATUSES: InvoiceStatus[] = [
  'draft',
  'awaiting_transfer',
  'paid',
  'refund_pending',
  'refunded_partial',
  'refunded',
];
const METHODS = ['wallet', 'cash', 'transfer', 'card'] as const;
const methodsText = (row: InvoiceRow) =>
  row.methods.length === 0
    ? '—'
    : row.methods.map((m) => (m === 'wallet' ? 'Ví' : METHOD_LABEL[m])).join(', ');

/** Hóa đơn (MH-31): every invoice of the shop, newest first; a draft waits for its payment. */
export function InvoicesScreen({ tenantSlug }: { tenantSlug: string }) {
  const { world, role } = useDesk(tenantSlug);
  const appHref = useAppHref(tenantSlug);
  const toast = useToast();
  const fill = useMediaQuery('(min-width: 768px)');
  const [q, setQ] = useQueryState('q', '');
  const [today, setToday] = useQueryState('today', '');
  const [method, setMethod] = useQueryState('method', '');
  const [status, setStatus] = useQueryState('status', '');

  const all = useMemo(
    () => invoiceRows(world.money, world.customers),
    [world.money, world.customers],
  );
  const phoneOf = (row: InvoiceRow) =>
    world.customers.find((c) => c.id === row.customerId)?.phone ?? '';
  const rows = all.filter((row) => {
    if (today && localDate(row.at) !== localDate(MOCK_NOW)) return false;
    if (method && !row.methods.includes(method as (typeof METHODS)[number])) return false;
    if (status && row.status !== status) return false;
    const text = q.trim();
    if (!text) return true;
    return (
      row.number.toLowerCase().includes(text.toLowerCase()) ||
      matchesPerson(row.customerName, phoneOf(row), text)
    );
  });

  const todays = all.filter((r) => localDate(r.at) === localDate(MOCK_NOW));
  const collectedToday = todays
    .filter((r) => r.status !== 'draft' && r.status !== 'awaiting_transfer')
    .reduce((m, r) => m + r.amountVnd, 0n);
  const pendingToday = todays.reduce((m, r) => m + r.pendingVnd, 0n);
  const drafts = todays.filter((r) => r.status === 'draft').length;
  const sub = `Hôm nay: ${todays.length} hóa đơn, đã thu ${formatVnd(collectedToday)}${
    pendingToday > 0n ? `, chờ tiền về ${formatVnd(pendingToday)}` : ''
  }${drafts > 0 ? `, ${drafts} chưa thu` : ''}`;

  const badge = (row: InvoiceRow) => (
    <span className={`sp-badge sp-badge--${invoiceStatusBadge[row.status]}`}>
      {invoiceStatusLabel[row.status]}
    </span>
  );
  const columns: Column<InvoiceRow>[] = [
    {
      key: 'number',
      width: '11%',
      label: 'Số',
      cell: (row) => (
        <Link href={appHref(`invoices/${row.id}`)} className="sp-num">
          {row.number}
        </Link>
      ),
    },
    {
      key: 'at',
      width: '14%',
      label: 'Giờ',
      cell: (row) => <span className="sp-num">{formatInvoiceTime(row.at)}</span>,
    },
    {
      key: 'customer',
      width: '30%',
      label: 'Khách',
      cell: (row) => (
        <div className="sp-table__primary">
          <span className="min-w-0">
            {row.customerId ? (
              <Link href={appHref(`customers/${row.customerId}`)}>{row.customerName}</Link>
            ) : (
              row.customerName
            )}
            <span className="sp-table__secondary">{row.summary}</span>
          </span>
        </div>
      ),
    },
    {
      key: 'amount',
      width: '14%',
      label: 'Tổng thu',
      numeric: true,
      cell: (row) => <span className="sp-num">{formatVnd(row.amountVnd)}</span>,
    },
    { key: 'methods', width: '16%', label: 'Phương thức', cell: methodsText },
    { key: 'status', width: '15%', label: 'Trạng thái', cell: badge },
  ];

  const canSell = role !== 'technician';
  const sell = (
    <Link href={appHref('sales/new')} className="sp-btn sp-btn--primary no-underline">
      <Plus size={16} aria-hidden="true" />
      Bán gói, nạp ví
    </Link>
  );

  return (
    <div
      className={cn('sp-shell__content sp-shell__content--wide', fill && 'sp-shell__content--fill')}
    >
      <PageHeader
        title="Hóa đơn"
        sub={sub}
        hideActionsOnPhone
        actions={
          <>
            <Button onClick={() => toast({ text: 'Xuất CSV: chưa có trong mock.' })}>
              <Download size={16} aria-hidden="true" />
              Xuất CSV
            </Button>
            {canSell && sell}
          </>
        }
      />
      {canSell && <PhoneHeaderAction>{sell}</PhoneHeaderAction>}
      <div className="sp-toolbar">
        <SearchField
          label="Tìm hóa đơn"
          placeholder="Số hóa đơn, tên hoặc số điện thoại"
          value={q}
          onChange={setQ}
        />
        <FilterChip pressed={today === '1'} onToggle={() => setToday(today === '1' ? '' : '1')}>
          Hôm nay
        </FilterChip>
        <ChipMenu
          label="Phương thức"
          value={method}
          allLabel="Tất cả"
          options={METHODS.map((m) => ({
            value: m,
            label: m === 'wallet' ? 'Ví' : METHOD_LABEL[m],
          }))}
          onChange={setMethod}
        />
        <ChipMenu
          label="Trạng thái"
          value={status}
          allLabel="Tất cả"
          options={STATUSES.map((s) => ({ value: s, label: invoiceStatusLabel[s] }))}
          onChange={setStatus}
        />
      </div>

      {rows.length === 0 ? (
        <div className="sp-empty flex flex-col items-start gap-(--space-3)">
          <p className="m-0">
            {all.length === 0
              ? 'Chưa có hóa đơn nào. Lịch hoàn thành sẽ tự có hóa đơn nháp.'
              : 'Không có hóa đơn nào khớp. Thử bỏ bớt bộ lọc hoặc đổi từ khóa.'}
          </p>
          {all.length > 0 && (
            <Button
              onClick={() => {
                setQ('');
                setToday('');
                setMethod('');
                setStatus('');
              }}
            >
              Bỏ lọc
            </Button>
          )}
        </div>
      ) : (
        <DataTable
          label="Danh sách hóa đơn"
          columns={columns}
          rows={rows}
          rowKey={(row) => row.id}
          cards={(row) => (
            <Link href={appHref(`invoices/${row.id}`)} className="sp-cards__item">
              <span className="sp-cards__body">
                <span className="sp-cards__title">
                  {row.number} · {row.customerName}
                </span>
                <span className="sp-cards__meta">
                  {formatInvoiceTime(row.at)} · {formatVnd(row.amountVnd)} · {methodsText(row)}
                </span>
              </span>
              {badge(row)}
              <ChevronRight size={16} aria-hidden="true" className="text-(--ink-muted)" />
            </Link>
          )}
          foot={
            <div className="sp-table-foot">
              <span>
                Hiển thị 1–{rows.length} trong {rows.length} hóa đơn
              </span>
            </div>
          }
          phoneFoot={<p className="sp-table-foot m-0">{rows.length} hóa đơn</p>}
        />
      )}
    </div>
  );
}
