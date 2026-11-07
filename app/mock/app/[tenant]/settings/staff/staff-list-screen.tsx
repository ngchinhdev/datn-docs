'use client';

import { ChevronRight, Plus } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import { useAppHref } from '@/components/mock/use-app-href';
import { Button } from '@/components/sapio/button';
import { DataTable, type Column } from '@/components/sapio/data-table';
import { FilterChip, SearchField } from '@/components/sapio/filters';
import { PageHeader } from '@/components/sapio/page-header';
import { Pagination, TableFoot } from '@/components/sapio/pagination';
import { useToast } from '@/components/sapio/toast';
import { tenantFixtures, type Staff } from '@/mock/fixtures';
import { fold } from '@/mock/customers';
import { initialsOfName } from '@/mock/people-format';
import { roleLabel } from '@/mock/selection';

const PAGE_SIZES = [20, 50, 100] as const;

export function StaffListScreen({ tenantSlug }: { tenantSlug: string }) {
  const fixture = tenantFixtures.find((f) => f.tenant.slug === tenantSlug) ?? tenantFixtures[0]!;
  const branch = fixture.branches[0]!;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const appHref = useAppHref(tenantSlug);
  const toast = useToast();

  const q = searchParams.get('q') ?? '';
  const onlineOnly = searchParams.get('online') === '1';
  const sizeParam = Number(searchParams.get('size'));
  const size = PAGE_SIZES.find((s) => s === sizeParam) ?? PAGE_SIZES[0];
  const pageParam = Number(searchParams.get('page'));

  const hrefWith = (patch: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(patch)) {
      if (value === null || value === '') params.delete(key);
      else params.set(key, value);
    }
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  };
  /** Changing what the list holds sends it back to the first page. */
  const update = (patch: Record<string, string | null>) =>
    router.replace(hrefWith({ ...patch, page: null }), { scroll: false });

  const rows = useMemo(
    () =>
      fixture.staff.filter(
        (s) =>
          (!onlineOnly || s.profile.bookableOnline) &&
          (!q.trim() ||
            fold(s.profile.displayName).includes(fold(q)) ||
            fold(s.profile.fullName).includes(fold(q))),
      ),
    [fixture, q, onlineOnly],
  );
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const page = Math.min(Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1, pages);
  const start = (page - 1) * size;
  const shown = rows.slice(start, start + size);
  const skillCount = (s: Staff) => s.skillServiceIds.length;

  const columns: Column<Staff>[] = [
    {
      key: 'name',
      label: 'Nhân viên',
      cell: (s) => (
        <div className="sp-table__primary">
          <span className="sp-avatar sp-avatar--sm">{initialsOfName(s.profile.displayName)}</span>
          <span className="min-w-0">
            <Link href={appHref(`settings/staff/${s.resourceId}`)}>{s.profile.displayName}</Link>
            <span className="sp-table__secondary">{s.profile.title}</span>
          </span>
        </div>
      ),
    },
    { key: 'role', label: 'Vai trò', cell: (s) => roleLabel(s.role) },
    { key: 'branch', label: 'Chi nhánh', cell: () => branch.name },
    {
      key: 'online',
      label: 'Nhận đặt online',
      cell: (s) => (s.profile.bookableOnline ? 'Có' : <span className="sp-muted">Không</span>),
    },
    { key: 'skills', label: 'Kỹ năng', numeric: true, cell: skillCount },
    {
      key: 'actions',
      label: 'Thao tác',
      labelHidden: true,
      cell: (s) => (
        <Link
          href={appHref('calendar', { staff: s.resourceId })}
          className="sp-btn sp-btn--ghost sp-btn--sm no-underline"
          aria-label={`Xem lịch của ${s.profile.displayName}`}
        >
          Xem lịch
        </Link>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Nhân sự"
        sub={`${fixture.staff.length} nhân viên · ${branch.name}`}
        actions={
          <Button
            variant="primary"
            onClick={() => toast({ text: 'Mời nhân viên: chưa có trong mock.' })}
          >
            <Plus size={16} aria-hidden="true" />
            Mời nhân viên
          </Button>
        }
      />
      <div className="sp-toolbar">
        <SearchField
          label="Tìm nhân viên"
          placeholder="Tên nhân viên"
          value={q}
          onChange={(value) => update({ q: value.trim() ? value : null })}
        />
        <FilterChip
          pressed={onlineOnly}
          onToggle={() => update({ online: onlineOnly ? null : '1' })}
        >
          Nhận đặt online
        </FilterChip>
      </div>
      {rows.length === 0 ? (
        <div className="sp-empty flex flex-col items-start gap-(--space-3)">
          <p className="m-0">Không có nhân viên nào khớp. Thử bỏ bộ lọc hoặc đổi từ khóa.</p>
          <Button onClick={() => update({ q: null, online: null })}>Bỏ lọc</Button>
        </div>
      ) : (
        <DataTable
          label="Danh sách nhân viên"
          columns={columns}
          rows={shown}
          rowKey={(s) => s.resourceId}
          cards={(s) => (
            <Link href={appHref(`settings/staff/${s.resourceId}`)} className="sp-cards__item">
              <span className="sp-avatar">{initialsOfName(s.profile.displayName)}</span>
              <span className="sp-cards__body">
                <span className="sp-cards__title">{s.profile.displayName}</span>
                <span className="sp-cards__meta">
                  {roleLabel(s.role)} · {s.profile.title}
                </span>
              </span>
              <ChevronRight size={16} aria-hidden="true" className="text-(--ink-muted)" />
            </Link>
          )}
          foot={
            <TableFoot
              summary={`Hiển thị ${start + 1}–${start + shown.length} trong ${rows.length} nhân viên`}
              page={page}
              pages={pages}
              hrefFor={(p) => hrefWith({ page: p === 1 ? null : String(p) })}
              size={size}
              sizes={PAGE_SIZES}
              onSize={(value) => update({ size: value === PAGE_SIZES[0] ? null : String(value) })}
            />
          }
          phoneFoot={
            <Pagination
              page={page}
              pages={pages}
              hrefFor={(p) => hrefWith({ page: p === 1 ? null : String(p) })}
            />
          }
        />
      )}
    </>
  );
}
