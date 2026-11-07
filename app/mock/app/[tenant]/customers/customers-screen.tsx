'use client';

import { ChevronRight, Download, Plus, SlidersHorizontal } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useAppHref } from '@/components/mock/use-app-href';
import { PhoneHeaderAction } from '@/components/sapio/app-shell';
import { Button } from '@/components/sapio/button';
import { DataTable, type Column } from '@/components/sapio/data-table';
import {
  ActiveFilters,
  ChipMenu,
  Count,
  FilterChip,
  SearchField,
} from '@/components/sapio/filters';
import { PageHeader } from '@/components/sapio/page-header';
import { Pagination, TableFoot } from '@/components/sapio/pagination';
import { useToast } from '@/components/sapio/toast';
import { useMediaQuery } from '@/components/sapio/use-media-query';
import { cn } from '@/lib/utils';
import {
  activeFilterCount,
  customerQueryParams,
  customerRows,
  filterCustomers,
  PAGE_SIZES,
  parseCustomerQuery,
  sortCustomers,
  type CustomerQuery,
  type CustomerRow,
  type SortKey,
} from '@/mock/customers';
import { tenantFixtures } from '@/mock/fixtures';
import { formatPhone } from '@/mock/format';
import { formatWhen, formatWhenInline, initialsOfName } from '@/mock/people-format';
import { MOCK_NOW } from '@/mock/time';
import { FilterSheet, VISIT_LABEL } from './filter-sheet';

/** First click on a column: names and phones read A to Z, dates and counts start from the top. */
const FIRST_DIR: Record<SortKey, 'asc' | 'desc'> = {
  name: 'asc',
  phone: 'asc',
  last: 'desc',
  next: 'asc',
  visits: 'desc',
  noShows: 'desc',
};

export function CustomersScreen({ tenantSlug }: { tenantSlug: string }) {
  const fixture = tenantFixtures.find((f) => f.tenant.slug === tenantSlug) ?? tenantFixtures[0]!;
  const branch = fixture.branches[0]!;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const appHref = useAppHref(tenantSlug);
  const toast = useToast();
  const [sheetOpen, setSheetOpen] = useState(false);
  // A table fills the screen from tablet up; on phones the page scrolls as a whole.
  const fill = useMediaQuery('(min-width: 768px)');

  const staffNoun = fixture.resourceTypes.find((t) => t.isStaff)?.name ?? 'Nhân viên';
  const query = useMemo(() => parseCustomerQuery(searchParams), [searchParams]);
  const allRows = useMemo(() => customerRows(fixture, MOCK_NOW), [fixture]);
  const staffName = (id: string) =>
    fixture.staff.find((s) => s.resourceId === id)?.profile.displayName ?? '';

  const filtered = useMemo(() => filterCustomers(allRows, query, MOCK_NOW), [allRows, query]);
  const sorted = useMemo(
    () => sortCustomers(filtered, query.sort, query.dir),
    [filtered, query.sort, query.dir],
  );
  const pages = Math.max(1, Math.ceil(sorted.length / query.size));
  const page = Math.min(query.page, pages);
  const start = (page - 1) * query.size;
  const shown = sorted.slice(start, start + query.size);

  const hrefFor = (next: Partial<CustomerQuery>) =>
    `${pathname}?${customerQueryParams({ ...query, ...next }, searchParams)}`;
  /** Changing what the list holds sends it back to the first page. */
  const update = (patch: Partial<CustomerQuery>) => {
    router.replace(hrefFor({ ...patch, page: 1 }), { scroll: false });
  };
  const sortBy = (key: string) => {
    const k = key as SortKey;
    update(
      query.sort === k
        ? { dir: query.dir === 'asc' ? 'desc' : 'asc' }
        : { sort: k, dir: FIRST_DIR[k] },
    );
  };
  const clearFilters = () =>
    update({ q: '', visit: 'all', upcoming: false, deposit: false, note: false, staff: '' });

  const filterCount = activeFilterCount(query);
  const active = [
    query.visit !== 'all' && {
      key: 'visit',
      label: VISIT_LABEL[query.visit],
      onRemove: () => update({ visit: 'all' }),
    },
    query.upcoming && {
      key: 'upcoming',
      label: 'Có lịch sắp tới',
      onRemove: () => update({ upcoming: false }),
    },
    query.deposit && {
      key: 'deposit',
      label: 'Bắt buộc cọc',
      onRemove: () => update({ deposit: false }),
    },
    query.note && {
      key: 'note',
      label: 'Có ghi chú nội bộ',
      onRemove: () => update({ note: false }),
    },
    query.staff !== '' && {
      key: 'staff',
      label: `${staffNoun} quen: ${staffName(query.staff)}`,
      onRemove: () => update({ staff: '' }),
    },
  ].filter((x): x is { key: string; label: string; onRemove: () => void } => Boolean(x));

  const secondary = (row: CustomerRow) => {
    if (row.depositRequired) return 'Lần sau bắt buộc cọc';
    if (row.visits === 0) return 'Khách mới';
    if (row.hasNote) return 'Có ghi chú';
    return row.preferredStaffId ? `${staffNoun} quen: ${staffName(row.preferredStaffId)}` : null;
  };
  const cardMeta = (row: CustomerRow) => {
    const detail = row.depositRequired
      ? `không đến ${row.noShows} lần`
      : row.visits === 0
        ? 'khách mới'
        : row.nextAt
          ? `lịch tới ${formatWhenInline(row.nextAt)}`
          : row.lastVisitAt
            ? formatWhenInline(row.lastVisitAt)
            : '';
    return [formatPhone(row.phone), detail].filter(Boolean).join(' · ');
  };

  const columns: Column<CustomerRow>[] = [
    {
      key: 'name',
      label: 'Khách',
      sortable: true,
      cell: (row) => (
        <div className="sp-table__primary">
          <span className="sp-avatar sp-avatar--sm">{initialsOfName(row.name)}</span>
          <span className="min-w-0">
            <Link href={appHref(`customers/${row.id}`)}>{row.name}</Link>
            {secondary(row) && <span className="sp-table__secondary">{secondary(row)}</span>}
          </span>
        </div>
      ),
    },
    {
      key: 'phone',
      label: 'Số điện thoại',
      sortable: true,
      cell: (row) => <span className="sp-num">{formatPhone(row.phone)}</span>,
    },
    {
      key: 'last',
      label: 'Lần gần nhất',
      sortable: true,
      cell: (row) =>
        row.lastVisitAt ? (
          <span className="sp-num">{formatWhen(row.lastVisitAt)}</span>
        ) : (
          <span className="sp-muted">Chưa đến</span>
        ),
    },
    {
      key: 'next',
      label: 'Lịch sắp tới',
      sortable: true,
      cell: (row) =>
        row.nextAt ? (
          <span className="sp-num">{formatWhen(row.nextAt)}</span>
        ) : (
          <span className="sp-muted">Không có</span>
        ),
    },
    { key: 'visits', label: 'Số lần', numeric: true, sortable: true, cell: (row) => row.visits },
    {
      key: 'noShows',
      label: 'Không đến',
      numeric: true,
      sortable: true,
      cell: (row) =>
        row.depositRequired ? (
          <span className="sp-badge sp-badge--no-show">{row.noShows}</span>
        ) : (
          row.noShows
        ),
    },
    {
      key: 'actions',
      label: 'Thao tác',
      labelHidden: true,
      cell: (row) => (
        <Button
          variant="ghost"
          size="sm"
          aria-label={`Đặt lịch cho ${row.name}`}
          onClick={() => toast({ text: 'Tạo lịch hẹn: chưa có trong mock.' })}
        >
          Đặt lịch
        </Button>
      ),
    },
  ];

  const empty =
    fixture.customers.length === 0 ? (
      <p className="sp-empty m-0">Chưa có khách nào. Khách đặt lịch online sẽ hiện ở đây.</p>
    ) : (
      <div className="sp-empty flex flex-col items-start gap-(--space-3)">
        <p className="m-0">Không có khách nào khớp. Thử bỏ bớt bộ lọc hoặc đổi từ khóa.</p>
        <Button onClick={clearFilters}>Bỏ lọc</Button>
      </div>
    );

  const addCustomer = () => toast({ text: 'Thêm khách: chưa có trong mock.' });

  return (
    <div className={cn('sp-shell__content', fill && 'sp-shell__content--fill')}>
      <PageHeader
        title="Khách hàng"
        sub={`${fixture.customers.length.toLocaleString('vi-VN')} khách · ${branch.name}`}
        hideActionsOnPhone
        actions={
          <>
            <Button onClick={() => toast({ text: 'Xuất danh sách: chưa có trong mock.' })}>
              <Download size={16} aria-hidden="true" />
              Xuất danh sách
            </Button>
            <Button variant="primary" onClick={addCustomer}>
              <Plus size={16} aria-hidden="true" />
              Thêm khách
            </Button>
          </>
        }
      />
      <PhoneHeaderAction>
        <Button variant="primary" className="h-11!" onClick={addCustomer}>
          <Plus size={16} aria-hidden="true" />
          Thêm khách
        </Button>
      </PhoneHeaderAction>

      <div className="sp-toolbar">
        <SearchField
          label="Tìm khách"
          placeholder="Tên hoặc số điện thoại"
          value={query.q}
          onChange={(q) => update({ q })}
        />
        <div className="contents max-md:hidden">
          <FilterChip
            pressed={query.visit === '30'}
            onToggle={() => update({ visit: query.visit === '30' ? 'all' : '30' })}
          >
            Đến trong 30 ngày
          </FilterChip>
          <FilterChip
            pressed={query.upcoming}
            onToggle={() => update({ upcoming: !query.upcoming })}
          >
            Có lịch sắp tới
          </FilterChip>
          <FilterChip pressed={query.deposit} onToggle={() => update({ deposit: !query.deposit })}>
            Bắt buộc cọc
          </FilterChip>
          <ChipMenu
            label={`${staffNoun} quen`}
            value={query.staff}
            allLabel="Tất cả"
            options={fixture.staff.map((s) => ({
              value: s.resourceId,
              label: s.profile.displayName,
            }))}
            onChange={(staff) => update({ staff })}
          />
        </div>
      </div>
      <div className="md:hidden">
        <ActiveFilters
          items={active}
          trailing={
            <Button
              size="sm"
              className="h-8!"
              aria-haspopup="dialog"
              onClick={() => setSheetOpen(true)}
            >
              <SlidersHorizontal size={16} aria-hidden="true" />
              Bộ lọc
              <Count value={filterCount} />
            </Button>
          }
        />
      </div>

      {sorted.length === 0 ? (
        empty
      ) : (
        <DataTable
          label="Danh sách khách hàng"
          columns={columns}
          rows={shown}
          rowKey={(row) => row.id}
          sort={{ key: query.sort, dir: query.dir }}
          onSort={sortBy}
          cards={(row) => (
            <Link href={appHref(`customers/${row.id}`)} className="sp-cards__item">
              <span className="sp-avatar">{initialsOfName(row.name)}</span>
              <span className="sp-cards__body">
                <span className="sp-cards__title">{row.name}</span>
                <span className="sp-cards__meta">{cardMeta(row)}</span>
              </span>
              {row.depositRequired ? (
                <span className="sp-badge sp-badge--no-show">Bắt buộc cọc</span>
              ) : (
                <ChevronRight size={16} aria-hidden="true" className="text-(--ink-muted)" />
              )}
            </Link>
          )}
          foot={
            <TableFoot
              summary={`Hiển thị ${(start + 1).toLocaleString('vi-VN')}–${(start + shown.length).toLocaleString('vi-VN')} trong ${sorted.length.toLocaleString('vi-VN')} khách`}
              page={page}
              pages={pages}
              hrefFor={(p) => hrefFor({ page: p })}
              size={query.size}
              sizes={PAGE_SIZES}
              onSize={(size) => update({ size: size as CustomerQuery['size'] })}
            />
          }
          phoneFoot={<Pagination page={page} pages={pages} hrefFor={(p) => hrefFor({ page: p })} />}
        />
      )}

      <FilterSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        query={query}
        rows={allRows}
        staffNoun={staffNoun}
        staff={fixture.staff.map((s) => ({ value: s.resourceId, label: s.profile.displayName }))}
        onApply={(patch) => {
          setSheetOpen(false);
          update(patch);
        }}
      />
    </div>
  );
}
