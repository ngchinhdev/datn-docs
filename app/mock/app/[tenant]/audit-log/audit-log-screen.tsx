'use client';

import { ChevronRight, Download } from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';
import { useScheduleStore } from '@/components/mock/schedule-store';
import { useAppHref } from '@/components/mock/use-app-href';
import { useQueryState } from '@/components/mock/use-query-state';
import { Button } from '@/components/sapio/button';
import { DataTable, type Column } from '@/components/sapio/data-table';
import { ChipMenu, SearchField } from '@/components/sapio/filters';
import { PageHeader } from '@/components/sapio/page-header';
import { useToast } from '@/components/sapio/toast';
import type { AuditEntry } from '@/mock/fixtures';
import { fold } from '@/mock/customers';
import { initialsOfName } from '@/mock/people-format';
import { addDays, formatDateTime, localDate, MOCK_NOW } from '@/mock/time';
import { SettingsFrame } from '../settings/settings-frame';

const RANGES = [
  { value: '7', label: '7 ngày', days: 7 },
  { value: '30', label: '30 ngày', days: 30 },
];

/** Nhật ký thao tác (MH-57): who did what to what, newest first; lines are only added (BR-63). */
export function AuditLogScreen({ tenantSlug }: { tenantSlug: string }) {
  const appHref = useAppHref(tenantSlug);
  const toast = useToast();
  const { money } = useScheduleStore();
  const [q, setQ] = useQueryState('q', '');
  const [who, setWho] = useQueryState('who', '');
  const [action, setAction] = useQueryState('action', '');
  const [range, setRange] = useQueryState('range', '7');

  const all = useMemo(
    () => [...money.audit].sort((a, b) => b.at.localeCompare(a.at) || b.id.localeCompare(a.id)),
    [money.audit],
  );
  const people = [...new Set(all.map((e) => e.by))];
  const actions = [...new Set(all.map((e) => e.action))];
  const days = RANGES.find((r) => r.value === range)?.days;
  const since = days === undefined ? '' : addDays(localDate(MOCK_NOW), -days);

  const rows = all.filter((e) => {
    if (who && e.by !== who) return false;
    if (action && e.action !== action) return false;
    if (since && localDate(e.at) < since) return false;
    const text = fold(q.trim());
    return !text || fold(`${e.object} ${e.detail}`).includes(text);
  });

  const columns: Column<AuditEntry>[] = [
    {
      key: 'at',
      width: '13%',
      label: 'Giờ',
      cell: (e) => <span className="sp-num">{formatDateTime(e.at)}</span>,
    },
    {
      key: 'by',
      width: '18%',
      label: 'Người',
      cell: (e) => (
        <div className="sp-table__primary">
          <span className="sp-avatar sp-avatar--sm">{initialsOfName(e.by)}</span>
          <span className="min-w-0">
            {e.by}
            <span className="sp-table__secondary">{e.role}</span>
          </span>
        </div>
      ),
    },
    { key: 'action', width: '17%', label: 'Thao tác', cell: (e) => e.action },
    {
      key: 'object',
      width: '17%',
      label: 'Đối tượng',
      cell: (e) => (e.href ? <Link href={appHref(e.href)}>{e.object}</Link> : e.object),
    },
    { key: 'detail', width: '35%', label: 'Chi tiết', cell: (e) => e.detail },
  ];

  return (
    <SettingsFrame tenantSlug={tenantSlug}>
      <PageHeader
        crumbs={[{ label: 'Cài đặt', href: appHref('settings') }, { label: 'Nhật ký thao tác' }]}
        title="Nhật ký thao tác"
        sub="Thao tác về tiền, quyền, chính sách và dữ liệu khách"
        actions={
          <Button variant="ghost" onClick={() => toast({ text: 'Xuất CSV: chưa có trong mock.' })}>
            <Download size={16} aria-hidden="true" />
            Xuất CSV
          </Button>
        }
      />
      <div className="sp-toolbar">
        <SearchField
          label="Tìm trong nhật ký"
          placeholder="Tìm theo đối tượng"
          value={q}
          onChange={setQ}
        />
        <ChipMenu
          label="Người"
          value={who}
          allLabel="Tất cả"
          options={people.map((p) => ({ value: p, label: p }))}
          onChange={setWho}
        />
        <ChipMenu
          label="Thao tác"
          value={action}
          allLabel="Tất cả"
          options={actions.map((a) => ({ value: a, label: a }))}
          onChange={setAction}
        />
        <ChipMenu
          label="Khoảng ngày"
          value={range}
          allLabel="Tất cả"
          options={RANGES.map((r) => ({ value: r.value, label: r.label }))}
          onChange={(v) => setRange(v === '' ? 'all' : v)}
        />
      </div>
      {rows.length === 0 ? (
        <div className="sp-empty flex flex-col items-start gap-(--space-3)">
          <p className="m-0">
            {all.length === 0
              ? 'Chưa có thao tác nào được ghi.'
              : 'Không có dòng nào khớp. Thử bỏ bớt bộ lọc.'}
          </p>
          {all.length > 0 && (
            <Button
              onClick={() => {
                setQ('');
                setWho('');
                setAction('');
                setRange('all');
              }}
            >
              Bỏ lọc
            </Button>
          )}
        </div>
      ) : (
        <DataTable
          label="Nhật ký thao tác"
          columns={columns}
          rows={rows}
          rowKey={(e) => e.id}
          minWidth={820}
          cards={(e) => (
            <div className="sp-cards__item">
              <span className="sp-cards__body">
                <span className="sp-cards__title">
                  {e.action} · {e.object}
                </span>
                <span className="sp-cards__meta">
                  {formatDateTime(e.at)} · {e.by} ({e.role}) · {e.detail}
                </span>
              </span>
              {e.href && (
                <ChevronRight size={16} aria-hidden="true" className="text-(--ink-muted)" />
              )}
            </div>
          )}
          foot={
            <div className="sp-table-foot">
              <span>Chỉ thêm, không sửa, không xóa; giữ 12 tháng (BR-63)</span>
            </div>
          }
          phoneFoot={
            <p className="sp-table-foot m-0">
              Chỉ thêm, không sửa, không xóa; giữ 12 tháng (BR-63)
            </p>
          }
        />
      )}
    </SettingsFrame>
  );
}
