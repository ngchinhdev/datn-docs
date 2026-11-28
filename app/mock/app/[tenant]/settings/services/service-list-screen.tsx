'use client';

import { ArrowDown, ArrowUp, Plus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useScheduleStore } from '@/components/mock/schedule-store';
import { useServiceStore } from '@/components/mock/service-store';
import { useStaffStore } from '@/components/mock/staff-store';
import { useAppHref } from '@/components/mock/use-app-href';
import { useQueryState } from '@/components/mock/use-query-state';
import { Button } from '@/components/sapio/button';
import { ConfirmDialog } from '@/components/sapio/confirm-dialog';
import { DataTable, type Column } from '@/components/sapio/data-table';
import { ChipMenu, SearchField } from '@/components/sapio/filters';
import { PageHeader } from '@/components/sapio/page-header';
import { useToast } from '@/components/sapio/toast';
import { isActive } from '@/mock/branch-settings';
import { fold } from '@/mock/customers';
import { tenantFixtures, type Service } from '@/mock/fixtures';
import { formatVnd } from '@/mock/format';
import {
  archiveService,
  buildService,
  moveService,
  newServiceId,
  OTHER_GROUP,
  restoreService,
  serviceNameTaken,
  serviceNeighbour,
} from '@/mock/service-settings';
import { capableStaff, durationText, fromPrice } from '@/mock/services';
import { MOCK_NOW } from '@/mock/time';
import { AddServiceDialog } from './add-service-dialog';
import { ServiceGroupsPanel } from './service-groups-panel';

/**
 * Dịch vụ (MH-44): the services under their groups, in the order the customer sees them (BR-94.5,
 * BR-94.11); switch one online or off, put one out of use and back (BR-94.10, BR-94.12, BR-94.13).
 */
export function ServiceListScreen({ tenantSlug }: { tenantSlug: string }) {
  const fixture = tenantFixtures.find((f) => f.tenant.slug === tenantSlug) ?? tenantFixtures[0]!;
  const router = useRouter();
  const appHref = useAppHref(tenantSlug);
  const toast = useToast();
  const { services, groups, add, setServices, setGroups } = useServiceStore();
  const { staff } = useStaffStore();
  const schedule = useScheduleStore();

  const [q, setQ] = useQueryState('q', '');
  const [groupFilter, setGroupFilter] = useQueryState('group', '');
  const [status, setStatus] = useQueryState('status', '');
  const [adding, setAdding] = useState(false);
  const [groupsOpen, setGroupsOpen] = useState(false);
  const [archiving, setArchiving] = useState<Service | null>(null);
  /** The button to hold focus after a row moved: `{service id}:{-1 or 1}`. */
  const [focusKey, setFocusKey] = useState<string | null>(null);

  const activeCount = services.filter(isActive).length;
  const open = (s: Service) => appHref(`settings/services/${s.id}`);

  // After a row moves up or down, the button that was pressed goes with it; keep it focused.
  useEffect(() => {
    if (focusKey === null) return;
    const [id, dir] = focusKey.split(':');
    const find = (d: string) =>
      [...document.querySelectorAll<HTMLButtonElement>(`[data-move="${id}:${d}"]`)].find(
        (el) => el.offsetParent !== null && !el.disabled,
      );
    (find(dir!) ?? find(dir === '-1' ? '1' : '-1'))?.focus();
    setFocusKey(null);
  }, [focusKey, services]);

  const matches = (s: Service) =>
    (status === 'archived' ? !isActive(s) : status === 'all' ? true : isActive(s)) &&
    (groupFilter === '' || (groupFilter === 'none' ? s.group === '' : s.group === groupFilter)) &&
    (q.trim() === '' || fold(s.name).includes(fold(q)));

  const sections = [
    ...groups.map((g) => ({ key: g, title: g, group: g })),
    { key: 'none', title: OTHER_GROUP, group: '' },
  ]
    .map((section) => {
      const own = services.filter((s) => s.group === section.group && matches(s));
      // In use first, in the order of the group; out of use after them.
      return { ...section, rows: [...own.filter(isActive), ...own.filter((s) => !isActive(s))] };
    })
    .filter((section) => section.rows.length > 0);

  const total = sections.reduce((n, section) => n + section.rows.length, 0);

  function toggle(s: Service, bookableOnline: boolean) {
    setServices(services.map((x) => (x.id === s.id ? { ...x, bookableOnline } : x)));
    toast({
      text: bookableOnline
        ? `${s.name} nhận đặt online.`
        : `${s.name} không còn hiện ở trang đặt lịch.`,
    });
  }

  function move(s: Service, dir: -1 | 1) {
    setServices(moveService(services, s.id, dir));
    setFocusKey(`${s.id}:${dir}`);
  }

  function restore(s: Service) {
    if (serviceNameTaken(services, s.name, s.id)) {
      toast({
        text: 'Đã có dịch vụ đang dùng tên này. Đổi tên một trong hai dịch vụ rồi dùng lại.',
        tone: 'danger',
      });
      return;
    }
    setServices(restoreService(services, s.id));
    toast({ text: `Đã dùng lại ${s.name}.` });
  }

  const orderButtons = (s: Service) =>
    isActive(s) && q.trim() === '' ? (
      <span className="inline-flex gap-1">
        <button
          type="button"
          className="sp-icon-btn"
          aria-label={`Lên: ${s.name}`}
          data-move={`${s.id}:-1`}
          disabled={!serviceNeighbour(services, s.id, -1)}
          onClick={() => move(s, -1)}
        >
          <ArrowUp size={16} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="sp-icon-btn"
          aria-label={`Xuống: ${s.name}`}
          data-move={`${s.id}:1`}
          disabled={!serviceNeighbour(services, s.id, 1)}
          onClick={() => move(s, 1)}
        >
          <ArrowDown size={16} aria-hidden="true" />
        </button>
      </span>
    ) : null;

  const switchOf = (s: Service) => (
    <label className="sp-switch justify-start!">
      <span className="sp-sr-only">Nhận đặt online: {s.name}</span>
      <input
        type="checkbox"
        role="switch"
        checked={s.bookableOnline}
        disabled={!isActive(s)}
        onChange={(e) => toggle(s, e.target.checked)}
      />
    </label>
  );

  const actionOf = (s: Service) =>
    isActive(s) ? (
      <Button variant="ghost" size="sm" onClick={() => setArchiving(s)}>
        Ngừng dùng
      </Button>
    ) : (
      <Button variant="ghost" size="sm" onClick={() => restore(s)}>
        Dùng lại
      </Button>
    );

  const columns: Column<Service>[] = [
    { key: 'order', width: '10%', label: 'Thứ tự', cell: orderButtons },
    {
      key: 'name',
      width: '16%',
      label: 'Dịch vụ',
      cell: (s) => (
        <>
          <span className="sp-table__primary">
            <Link href={open(s)}>{s.name}</Link>
          </span>
          {!isActive(s) && <span className="sp-badge sp-badge--completed">Đã ngừng dùng</span>}
        </>
      ),
    },
    {
      key: 'variants',
      width: '11%',
      label: 'Biến thể',
      numeric: true,
      cell: (s) => s.variants.length,
    },
    {
      key: 'duration',
      width: '13%',
      label: 'Khách thấy',
      cell: (s) => <span className="sp-num">{durationText(s.variants)}</span>,
    },
    {
      key: 'price',
      width: '9%',
      label: 'Giá từ',
      numeric: true,
      cell: (s) => (
        <span className="sp-num">{formatVnd(fromPrice(s, capableStaff(s, staff)))}</span>
      ),
    },
    {
      key: 'staff',
      width: '11%',
      label: 'Người làm',
      numeric: true,
      cell: (s) => capableStaff(s, staff).length,
    },
    { key: 'online', width: '17%', label: 'Nhận đặt online', cell: switchOf },
    {
      key: 'actions',
      width: '13%',
      label: 'Thao tác',
      labelHidden: true,
      cell: actionOf,
    },
  ];

  const staffType = schedule.resourceTypes.find((t) => t.isStaff);

  return (
    <>
      <PageHeader
        crumbs={[{ label: 'Cài đặt', href: appHref('settings') }, { label: 'Dịch vụ' }]}
        title="Dịch vụ"
        sub={`${activeCount} dịch vụ đang dùng · ${groups.length} nhóm`}
        actions={
          <>
            <Button onClick={() => setGroupsOpen(true)}>Nhóm dịch vụ</Button>
            <Button variant="primary" onClick={() => setAdding(true)}>
              <Plus size={16} aria-hidden="true" />
              Thêm dịch vụ
            </Button>
          </>
        }
      />
      <div className="sp-toolbar">
        <SearchField
          label="Tìm dịch vụ"
          placeholder="Tên dịch vụ"
          value={q}
          onChange={(value) => setQ(value.trim() ? value : '')}
        />
        <ChipMenu
          label="Nhóm"
          value={groupFilter}
          allLabel="Tất cả"
          options={[
            ...groups.map((g) => ({ value: g, label: g })),
            { value: 'none', label: OTHER_GROUP },
          ]}
          onChange={setGroupFilter}
        />
        <ChipMenu
          label="Trạng thái"
          value={status}
          allLabel="Đang dùng"
          options={[
            { value: 'archived', label: 'Đã ngừng dùng' },
            { value: 'all', label: 'Tất cả' },
          ]}
          onChange={setStatus}
        />
      </div>
      <div className="flex items-start gap-(--space-5)">
        <section className="flex min-w-0 flex-auto flex-col gap-(--space-5)" aria-label="Dịch vụ">
          {total === 0 ? (
            <div className="sp-empty flex flex-col items-start gap-(--space-3)">
              {services.length === 0 ? (
                <>
                  <p className="m-0">
                    Chưa có dịch vụ nào. Thêm dịch vụ đầu tiên để khách đặt lịch.
                  </p>
                  <Button variant="primary" onClick={() => setAdding(true)}>
                    Thêm dịch vụ
                  </Button>
                </>
              ) : status === 'archived' && q.trim() === '' && groupFilter === '' ? (
                <p className="m-0">Chưa có dịch vụ nào ngừng dùng.</p>
              ) : (
                <>
                  <p className="m-0">Không có dịch vụ nào khớp.</p>
                  <Button
                    onClick={() => {
                      setQ('');
                      setGroupFilter('');
                      setStatus('');
                    }}
                  >
                    Bỏ lọc
                  </Button>
                </>
              )}
            </div>
          ) : (
            sections.map((section) => (
              <section
                key={section.key}
                className="flex flex-col gap-(--space-2)"
                aria-label={section.title}
              >
                <h2 className="m-0 text-[15px] leading-6 font-semibold">
                  {section.title} · <span className="sp-num">{section.rows.length}</span>
                </h2>
                <DataTable
                  label={section.title}
                  minWidth={860}
                  columns={columns}
                  rows={section.rows}
                  rowKey={(s) => s.id}
                  cards={(s) => {
                    const capable = capableStaff(s, staff);
                    return (
                      <div className="sp-cards__item">
                        <span className="sp-cards__body">
                          <span className="sp-cards__title">
                            <Link href={open(s)}>{s.name}</Link>
                          </span>
                          <span className="sp-cards__meta">
                            {s.variants.length} biến thể · {durationText(s.variants)} · từ{' '}
                            {formatVnd(fromPrice(s, capable))}
                            {!isActive(s) && ' · Đã ngừng dùng'}
                          </span>
                          <span className="flex flex-wrap items-center gap-2">
                            {switchOf(s)}
                            {orderButtons(s)}
                            {actionOf(s)}
                          </span>
                        </span>
                      </div>
                    );
                  }}
                  foot={
                    <div className="sp-table-foot">
                      <span className="sp-num">{section.rows.length} dịch vụ</span>
                    </div>
                  }
                  phoneFoot={
                    <p className="sp-table-foot m-0">
                      <span className="sp-num">{section.rows.length} dịch vụ</span>
                    </p>
                  }
                />
              </section>
            ))
          )}
        </section>
        {groupsOpen && (
          <ServiceGroupsPanel
            groups={groups}
            services={services}
            onClose={() => setGroupsOpen(false)}
            onChange={(next, nextServices, text) => {
              setGroups(next, nextServices);
              if (text) toast({ text });
            }}
          />
        )}
      </div>

      {adding && (
        <AddServiceDialog
          services={services}
          groups={groups}
          defaultGroup={groupFilter !== '' && groupFilter !== 'none' ? groupFilter : ''}
          onClose={() => setAdding(false)}
          onAdd={(input) => {
            const id = newServiceId(services, fixture.tenant.id);
            const service = buildService(
              input,
              id,
              fixture.tenant.id,
              staffType?.id ?? fixture.resourceTypes[0]!.id,
            );
            add(service);
            toast({ text: `Đã thêm ${service.name}.` });
            setAdding(false);
            router.push(open(service));
          }}
        />
      )}

      {archiving && (
        <ConfirmDialog
          open
          title={`Ngừng dùng ${archiving.name}?`}
          body="Dịch vụ không hiện ở trang khách và lễ tân không chọn được nữa. Biến thể, đoạn và giá giữ nguyên, dùng lại được."
          confirmLabel="Ngừng dùng"
          backLabel="Quay lại"
          onClose={() => setArchiving(null)}
          onConfirm={() => {
            setServices(archiveService(services, archiving.id, MOCK_NOW));
            toast({ text: `Đã ngừng dùng ${archiving.name}.` });
            setArchiving(null);
          }}
        />
      )}
    </>
  );
}
