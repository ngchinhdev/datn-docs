'use client';

import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import { useScheduleStore } from '@/components/mock/schedule-store';
import { useAppHref } from '@/components/mock/use-app-href';
import { useLiveFixture } from '@/components/mock/use-live-fixture';
import { Button } from '@/components/sapio/button';
import { DataTable, type Column } from '@/components/sapio/data-table';
import { ChipMenu, FilterChip } from '@/components/sapio/filters';
import { PageHeader } from '@/components/sapio/page-header';
import type { StaffTimeOff } from '@/mock/fixtures';
import { affectedByLeave, windowText } from '@/mock/leave';
import { initialsOfName } from '@/mock/people-format';
import { formatDateTime, formatDay, MOCK_TODAY } from '@/mock/time';

const STATUS = {
  pending: ['sp-badge--pending', 'Chờ duyệt'],
  approved: ['sp-badge--confirmed', 'Đã duyệt'],
  rejected: ['sp-badge--cancelled', 'Từ chối'],
} as const;

/** `Thứ Ba 10/11, cả ngày`. */
const whenText = (leave: StaffTimeOff) =>
  `${formatDay(leave.date).replace(',', '')}, ${windowText(leave)}`;

/** Nghỉ phép (MH-39): the requests, pending first, and the appointments left without a person. */
export function TimeOffListScreen({ tenantSlug }: { tenantSlug: string }) {
  const fixture = useLiveFixture(tenantSlug);
  const { appointments, leaves, requeues } = useScheduleStore();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const appHref = useAppHref(tenantSlug);
  const branch = fixture.branches[0]!;

  const pendingOnly = searchParams.get('status') === 'pending';
  const upcomingOnly = searchParams.get('upcoming') === '1';
  const staffFilter = searchParams.get('staff') ?? '';
  const update = (patch: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(patch)) {
      if (value === null || value === '') params.delete(key);
      else params.set(key, value);
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const nameOf = (id: string) => fixture.resources.find((r) => r.id === id)?.name ?? id;
  const affectedCount = (leave: StaffTimeOff) =>
    leave.status === 'pending'
      ? affectedByLeave(appointments, leave).length
      : (leave.affectedCount ?? 0);

  const pendingCount = leaves.filter((l) => l.status === 'pending').length;
  const rows = useMemo(
    () =>
      leaves
        .filter(
          (l) =>
            (!pendingOnly || l.status === 'pending') &&
            (!upcomingOnly || l.date >= MOCK_TODAY) &&
            (!staffFilter || l.resourceId === staffFilter),
        )
        .sort(
          (a, b) =>
            Number(b.status === 'pending') - Number(a.status === 'pending') ||
            (a.status === 'pending' ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date)),
        ),
    [leaves, pendingOnly, upcomingOnly, staffFilter],
  );

  const open = (leave: StaffTimeOff) => appHref(`time-off/${leave.id}`);
  const columns: Column<StaffTimeOff>[] = [
    {
      key: 'staff',
      width: '15%',
      label: 'Nhân viên',
      cell: (l) => (
        <span className="sp-table__primary">
          <span className="sp-avatar sp-avatar--sm">{initialsOfName(nameOf(l.resourceId))}</span>
          <Link href={open(l)}>{nameOf(l.resourceId)}</Link>
        </span>
      ),
    },
    {
      key: 'when',
      width: '22%',
      label: 'Thời gian',
      cell: (l) => <span className="sp-num">{whenText(l)}</span>,
    },
    { key: 'reason', width: '17%', label: 'Lý do', cell: (l) => l.reason },
    {
      key: 'affected',
      width: '12%',
      label: 'Lịch bị ảnh hưởng',
      numeric: true,
      cell: (l) => <span className="sp-num">{affectedCount(l)}</span>,
    },
    {
      key: 'status',
      width: '12%',
      label: 'Trạng thái',
      cell: (l) => <span className={`sp-badge ${STATUS[l.status][0]}`}>{STATUS[l.status][1]}</span>,
    },
    {
      key: 'sent',
      width: '12%',
      label: 'Gửi lúc',
      cell: (l) => <span className="sp-num">{formatDateTime(l.sentAt)}</span>,
    },
    {
      key: 'actions',
      width: '10%',
      label: 'Thao tác',
      labelHidden: true,
      cell: (l) =>
        l.status === 'pending' ? (
          <Link
            href={open(l)}
            className="sp-btn sp-btn--ghost sp-btn--sm no-underline"
            aria-label={`Xử lý đơn nghỉ của ${nameOf(l.resourceId)}, ${whenText(l)}`}
          >
            Xử lý
          </Link>
        ) : null,
    },
  ];

  const waiting = requeues.filter((r) => r.appointmentIds.length > 0);
  return (
    <div className="sp-shell__content">
      <PageHeader title="Nghỉ phép" sub={`${pendingCount} đơn chờ duyệt · ${branch.name}`} />
      {waiting.length > 0 && (
        <section className="sp-panel" aria-labelledby="tl-requeue">
          <h2 className="sp-panel__title" id="tl-requeue">
            Cần xếp lại
          </h2>
          <p className="sp-panel__note">
            Lịch hẹn mất người làm vì bớt ca. Xử lý như đơn nghỉ phép (BR-11, BR-35).
          </p>
          <ul className="m-0 flex list-none flex-col gap-(--space-2) p-0">
            {waiting.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-(--space-2)"
              >
                <span className="sp-num text-sm leading-5">
                  {nameOf(r.resourceId)} · {formatDay(r.date).replace(',', '')} · {r.reason} ·{' '}
                  {r.appointmentIds.length} lịch
                </span>
                <Link
                  href={appHref(`time-off/${r.id}`)}
                  className="sp-btn sp-btn--secondary sp-btn--sm no-underline"
                >
                  Xử lý
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      <div className="sp-toolbar">
        <FilterChip
          pressed={pendingOnly}
          onToggle={() => update({ status: pendingOnly ? null : 'pending' })}
        >
          Chờ duyệt <span className="sp-chip__value">{pendingCount}</span>
        </FilterChip>
        <FilterChip
          pressed={upcomingOnly}
          onToggle={() => update({ upcoming: upcomingOnly ? null : '1' })}
        >
          Sắp tới
        </FilterChip>
        <ChipMenu
          label="Nhân viên"
          value={staffFilter}
          allLabel="Tất cả"
          options={fixture.staff.map((s) => ({
            value: s.resourceId,
            label: s.profile.displayName,
          }))}
          onChange={(value) => update({ staff: value || null })}
        />
      </div>
      {rows.length === 0 ? (
        <div className="sp-empty flex flex-col items-start gap-(--space-3)">
          <p className="m-0">Không có đơn nào khớp. Thử bỏ bộ lọc.</p>
          <Button onClick={() => update({ status: null, upcoming: null, staff: null })}>
            Bỏ lọc
          </Button>
        </div>
      ) : (
        <DataTable
          label="Đơn nghỉ phép"
          columns={columns}
          rows={rows}
          rowKey={(l) => l.id}
          onRowOpen={(l) => router.push(open(l))}
          cards={(l) => (
            <Link href={open(l)} className="sp-cards__item">
              <span className="sp-avatar">{initialsOfName(nameOf(l.resourceId))}</span>
              <span className="sp-cards__body">
                <span className="sp-cards__title">
                  {nameOf(l.resourceId)} · {whenText(l)}
                </span>
                <span className="sp-cards__meta">
                  {l.reason} · {affectedCount(l)} lịch · {formatDateTime(l.sentAt)}
                </span>
              </span>
              <span className={`sp-badge ${STATUS[l.status][0]}`}>{STATUS[l.status][1]}</span>
              <ChevronRight size={16} aria-hidden="true" className="text-(--ink-muted)" />
            </Link>
          )}
          foot={
            <div className="sp-table-foot">
              <span className="sp-num">{rows.length} đơn</span>
            </div>
          }
          phoneFoot={<span className="sp-num body-sm text-(--ink-muted)">{rows.length} đơn</span>}
        />
      )}
      <p className="sp-form-section__desc m-0">
        Đơn chỉ duyệt được khi mọi lịch bị ảnh hưởng đã có cách xử lý (BR-11). Từ chối thì nhân viên
        nhận thông báo kèm lý do.
      </p>
    </div>
  );
}
