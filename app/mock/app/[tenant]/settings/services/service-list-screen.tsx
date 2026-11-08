'use client';

import { ChevronRight, Plus } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import { useServiceStore } from '@/components/mock/service-store';
import { useStaffStore } from '@/components/mock/staff-store';
import { useAppHref } from '@/components/mock/use-app-href';
import { Button } from '@/components/sapio/button';
import { DataTable, type Column } from '@/components/sapio/data-table';
import { FilterChip, SearchField } from '@/components/sapio/filters';
import { PageHeader } from '@/components/sapio/page-header';
import { useToast } from '@/components/sapio/toast';
import { fold } from '@/mock/customers';
import { tenantFixtures, type Service } from '@/mock/fixtures';
import { formatVnd } from '@/mock/format';
import { capableStaff, durationText, fromPrice } from '@/mock/services';

export function ServiceListScreen({ tenantSlug }: { tenantSlug: string }) {
  const fixture = tenantFixtures.find((f) => f.tenant.slug === tenantSlug) ?? tenantFixtures[0]!;
  const branch = fixture.branches[0]!;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const appHref = useAppHref(tenantSlug);
  const toast = useToast();
  const { services, save } = useServiceStore();
  const { staff } = useStaffStore();

  const q = searchParams.get('q') ?? '';
  const onlineOnly = searchParams.get('online') === '1';

  const update = (patch: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(patch)) {
      if (value === null || value === '') params.delete(key);
      else params.set(key, value);
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const rows = useMemo(
    () =>
      services.filter(
        (s) =>
          (!onlineOnly || s.bookableOnline) &&
          (!q.trim() || fold(s.name).includes(fold(q)) || fold(s.group).includes(fold(q))),
      ),
    [services, q, onlineOnly],
  );

  const open = (s: Service) => appHref(`settings/services/${s.id}`);
  const toggle = (s: Service, bookableOnline: boolean) => {
    save({ ...s, bookableOnline });
    toast({
      text: bookableOnline
        ? `${s.name} nhận đặt online.`
        : `${s.name} không còn hiện ở trang đặt lịch.`,
    });
  };

  const columns: Column<Service>[] = [
    {
      key: 'name',
      width: '25%',
      label: 'Dịch vụ',
      cell: (s) => (
        <>
          <span className="sp-table__primary">
            <Link href={open(s)}>{s.name}</Link>
          </span>
          <span className="sp-table__secondary">{s.group}</span>
        </>
      ),
    },
    {
      key: 'variants',
      width: '9%',
      label: 'Biến thể',
      numeric: true,
      cell: (s) => s.variants.length,
    },
    {
      key: 'duration',
      width: '18%',
      label: 'Khách thấy',
      cell: (s) => <span className="sp-num">{durationText(s.variants)}</span>,
    },
    {
      key: 'price',
      width: '15%',
      label: 'Giá từ',
      numeric: true,
      cell: (s) => (
        <span className="sp-num">{formatVnd(fromPrice(s, capableStaff(s, staff)))}</span>
      ),
    },
    {
      key: 'staff',
      width: '17%',
      label: 'Người làm được',
      numeric: true,
      cell: (s) => capableStaff(s, staff).length,
    },
    {
      key: 'online',
      width: '16%',
      label: 'Nhận đặt online',
      cell: (s) => (
        <label className="sp-switch justify-start!">
          <span className="sp-sr-only">Nhận đặt online: {s.name}</span>
          <input
            type="checkbox"
            role="switch"
            checked={s.bookableOnline}
            onChange={(e) => toggle(s, e.target.checked)}
          />
        </label>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Dịch vụ"
        sub={`${services.length} dịch vụ · ${branch.name}`}
        actions={
          <Button
            variant="primary"
            onClick={() => toast({ text: 'Thêm dịch vụ: chưa có trong mock.' })}
          >
            <Plus size={16} aria-hidden="true" />
            Thêm dịch vụ
          </Button>
        }
      />
      <div className="sp-toolbar">
        <SearchField
          label="Tìm dịch vụ"
          placeholder="Tên hoặc nhóm dịch vụ"
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
          <p className="m-0">Không có dịch vụ nào khớp. Thử bỏ bộ lọc hoặc đổi từ khóa.</p>
          <Button onClick={() => update({ q: null, online: null })}>Bỏ lọc</Button>
        </div>
      ) : (
        <DataTable
          label="Danh sách dịch vụ"
          columns={columns}
          rows={rows}
          rowKey={(s) => s.id}
          onRowOpen={(s) => router.push(open(s))}
          cards={(s) => {
            const capable = capableStaff(s, staff);
            return (
              <Link href={open(s)} className="sp-cards__item">
                <span className="sp-cards__body">
                  <span className="sp-cards__title">{s.name}</span>
                  <span className="sp-cards__meta">
                    {s.variants.length} biến thể · {durationText(s.variants)} · từ{' '}
                    {formatVnd(fromPrice(s, capable))}
                  </span>
                  <span className="sp-cards__meta">
                    {s.bookableOnline ? 'Nhận đặt online' : 'Không nhận đặt online'} ·{' '}
                    {capable.length} người làm được
                  </span>
                </span>
                <ChevronRight size={16} aria-hidden="true" className="text-(--ink-muted)" />
              </Link>
            );
          }}
          foot={
            <div className="sp-table-foot">
              <span className="sp-num">{rows.length} dịch vụ</span>
            </div>
          }
          phoneFoot={null}
        />
      )}
    </>
  );
}
