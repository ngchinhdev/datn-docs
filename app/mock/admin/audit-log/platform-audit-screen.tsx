'use client';

import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';
import { usePlatform } from '@/components/mock/platform-store';
import { useQueryState } from '@/components/mock/use-query-state';
import { DataTable, type Column } from '@/components/sapio/data-table';
import { ChipMenu, SearchField } from '@/components/sapio/filters';
import { PageHeader } from '@/components/sapio/page-header';
import type { PlatformLogEntry } from '@/mock/fixtures/platform';
import { fold } from '@/mock/platform';
import { initialsOfName } from '@/mock/people-format';
import { formatDateTime } from '@/mock/time';

const detailOf = (e: PlatformLogEntry) => (e.reason ? `${e.detail}. Lý do: ${e.reason}` : e.detail);

/** Nhật ký nền tảng: what the platform admin did, newest first; lines are only added (BR-63, BR-75). */
export function PlatformAuditScreen() {
  const { log } = usePlatform();
  const [q, setQ] = useQueryState('q', '');
  const [action, setAction] = useQueryState('action', '');

  const all = useMemo(
    () => [...log].sort((a, b) => b.at.localeCompare(a.at) || b.id.localeCompare(a.id)),
    [log],
  );
  const actions = [...new Set(all.map((e) => e.action))];
  const text = fold(q.trim());
  const rows = all.filter(
    (e) =>
      (!action || e.action === action) &&
      (!text || fold(`${e.object} ${detailOf(e)}`).includes(text)),
  );

  const columns: Column<PlatformLogEntry>[] = [
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
    { key: 'action', width: '15%', label: 'Thao tác', cell: (e) => e.action },
    {
      key: 'object',
      width: '17%',
      label: 'Đối tượng',
      cell: (e) =>
        e.tenantId ? <Link href={`/mock/admin/tenants/${e.tenantId}`}>{e.object}</Link> : e.object,
    },
    { key: 'detail', width: '37%', label: 'Chi tiết', cell: detailOf },
  ];

  return (
    <div className="sp-shell__content sp-shell__content--wide">
      <PageHeader
        title="Nhật ký nền tảng"
        sub="Khóa, mở khóa, gia hạn thủ công và thay đổi gói, giá"
      />
      <div className="sp-toolbar">
        <SearchField
          label="Tìm trong nhật ký"
          placeholder="Tìm theo cơ sở hoặc nội dung"
          value={q}
          onChange={setQ}
        />
        <ChipMenu
          label="Thao tác"
          value={action}
          allLabel="Tất cả"
          options={actions.map((a) => ({ value: a, label: a }))}
          onChange={setAction}
        />
      </div>
      {rows.length === 0 ? (
        <div className="sp-empty">
          {all.length === 0
            ? 'Chưa có thao tác nào được ghi.'
            : 'Không có dòng nào khớp. Thử bỏ bớt bộ lọc.'}
        </div>
      ) : (
        <DataTable
          label="Nhật ký nền tảng"
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
                  {formatDateTime(e.at)} · {e.by} · {detailOf(e)}
                </span>
              </span>
              {e.tenantId && (
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
    </div>
  );
}
