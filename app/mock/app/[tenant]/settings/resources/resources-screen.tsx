'use client';

import { ArrowDown, ArrowUp, Lock, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useScheduleStore } from '@/components/mock/schedule-store';
import { useAppHref } from '@/components/mock/use-app-href';
import { useDesk } from '@/components/mock/use-desk';
import { useQueryState } from '@/components/mock/use-query-state';
import { Button } from '@/components/sapio/button';
import { ConfirmDialog } from '@/components/sapio/confirm-dialog';
import { DataTable, type Column } from '@/components/sapio/data-table';
import { ChipMenu } from '@/components/sapio/filters';
import { Field } from '@/components/sapio/form';
import { PageHeader } from '@/components/sapio/page-header';
import { SidePanel } from '@/components/sapio/side-panel';
import { useToast } from '@/components/sapio/toast';
import type { Branch, Resource, ResourceOutage, ResourceType } from '@/mock/fixtures';
import {
  cleanName,
  FOREVER,
  isActive,
  moveResource,
  neighbour,
  resourceNameTaken,
  resourceState,
  typeDeleteBlock,
  typeNameTaken,
} from '@/mock/branch-settings';
import { activeOutage, outageImpact, upcomingCount } from '@/mock/outage';
import { lookups } from '@/mock/reception';
import { branchRequeues } from '@/mock/shop';
import { formatDateTime, formatTime, localDate, localToUtc, MOCK_NOW } from '@/mock/time';

let outageSequence = 0;
let requeueSequence = 0;

const toInput = (iso: string) => `${localDate(iso)}T${formatTime(iso)}`;
const fromInput = (value: string) => localToUtc(value.slice(0, 10), value.slice(11, 16));
const validInput = (value: string) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value);
const dayMonth = (iso: string) => `${localDate(iso).slice(8)}/${localDate(iso).slice(5, 7)}`;
const outageText = (o: ResourceOutage) => `${formatDateTime(o.from)}–${formatTime(o.to)}`;

/**
 * Tài nguyên (MH-46): ghế, giường, phòng the services need, in the order the system picks them
 * (BR-93.23, BR-57); take one out of use for a while (BR-93.24) or for good (BR-93.27).
 */
export function ResourcesScreen({ tenantSlug }: { tenantSlug: string }) {
  const desk = useDesk(tenantSlug);
  const { fixture, ctx } = desk;
  const store = useScheduleStore();
  const appHref = useAppHref(tenantSlug);
  const toast = useToast();
  const L = useMemo(() => lookups(fixture), [fixture]);
  const [branchFilter, setBranchFilter] = useQueryState('branch', '');
  const [typeFilter, setTypeFilter] = useQueryState('type', '');
  const [statusFilter, setStatusFilter] = useQueryState('status', '');
  const [stopping, setStopping] = useState<Resource | null>(null);
  const [archiving, setArchiving] = useState<Resource | null>(null);
  const [editing, setEditing] = useState<Resource | 'new' | null>(null);
  const [typesOpen, setTypesOpen] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [reason, setReason] = useState('');

  const branches: Branch[] = [store.branch, ...store.extraBranches];
  const activeBranches = branches.filter(isActive);
  const branchOrder = new Map(branches.map((b, i) => [b.id, i]));
  const branchName = (id: string) => branches.find((b) => b.id === id)?.name ?? '';
  const types = store.resourceTypes.filter((t) => !t.isStaff);
  const typeName = (id: string) => types.find((t) => t.id === id)?.name ?? '';
  const outages = fixture.config.outages;
  const stateOf = (r: Resource) => resourceState(r, branches, outages, MOCK_NOW);

  const owned = store.resources.filter((r) => types.some((t) => t.id === r.resourceTypeId));
  const visible = owned
    .filter((r) => !branchFilter || r.branchId === branchFilter)
    .filter((r) => !typeFilter || r.resourceTypeId === typeFilter)
    .filter((r) => {
      const state = stateOf(r);
      if (statusFilter === 'ok') return state === 'active';
      if (statusFilter === 'out') return state === 'paused';
      if (statusFilter === 'archived') return state === 'archived';
      return state !== 'archived';
    })
    .sort((a, b) => (branchOrder.get(a.branchId) ?? 0) - (branchOrder.get(b.branchId) ?? 0));
  const groups = types
    .map((t) => ({ type: t, rows: visible.filter((r) => r.resourceTypeId === t.id) }))
    .filter((g) => g.rows.length > 0);

  const fromIso = validInput(from) ? fromInput(from) : null;
  const toIso = validInput(to) ? fromInput(to) : null;
  /** BR-93.24: a start before now is stored as now. */
  const startIso = fromIso && fromIso < MOCK_NOW ? MOCK_NOW : fromIso;
  const impactsOf = (resource: Resource | null, a: string | null, b: string | null) =>
    resource && a && b && a < b
      ? outageImpact({ fixture, resourceId: resource.id, from: a, to: b, now: MOCK_NOW })
      : [];
  const impacts = useMemo(
    () => impactsOf(stopping, startIso, toIso),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stopping, startIso, toIso, fixture],
  );
  const archiveImpacts = useMemo(
    () => impactsOf(archiving, MOCK_NOW, FOREVER),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [archiving, fixture],
  );
  const stuck = impacts.filter((i) => !i.moved);
  const overlaps =
    stopping && startIso && toIso
      ? outages.some((o) => o.resourceId === stopping.id && o.from < toIso && startIso < o.to)
      : false;
  const problem =
    !fromIso || !toIso
      ? 'Chọn giờ bắt đầu và kết thúc.'
      : fromIso >= toIso
        ? 'Giờ kết thúc phải sau giờ bắt đầu.'
        : toIso <= MOCK_NOW
          ? 'Khoảng ngưng phải còn tới sau bây giờ.'
          : reason.trim() === ''
            ? 'Nhập lý do.'
            : overlaps
              ? 'Khoảng này chồng với một khoảng đã tạm ngưng.'
              : null;

  function openStop(r: Resource) {
    setTypesOpen(false);
    setStopping(r);
    setFrom(toInput(MOCK_NOW));
    setTo(toInput(new Date(Date.parse(MOCK_NOW) + 4 * 3_600_000).toISOString()));
    setReason('');
  }

  /** BR-93.26, BR-93.27 (BR-37): what fits another resource moves at once; the rest waits in "Cần xếp lại". */
  function place(
    resource: Resource,
    list: ReturnType<typeof impactsOf>,
    label: string,
    reasonText: string,
  ) {
    const now = ctx();
    for (const i of list) if (i.moved) store.replaceAppointment(i.moved);
    const left = list.filter((i) => !i.moved);
    if (left.length > 0) {
      store.addRequeues(
        branchRequeues(
          left.map((i) => i.appt),
          { kind: 'outage', label, reason: reasonText, resourceId: resource.id },
          now.now,
          (n) => `${fixture.tenant.id}-rq-out-${(requeueSequence += 1)}-${n}`,
        ),
      );
    }
    return { moved: list.length - left.length, requeued: left.length, now: now.now };
  }

  const counts = (moved: number, requeued: number) =>
    moved + requeued > 0
      ? ` ${moved} lịch tự chuyển${requeued > 0 ? `, ${requeued} lịch vào "Cần xếp lại"` : ''}.`
      : '';

  function stop() {
    if (!stopping || problem || !startIso || !toIso) return;
    const placed = place(stopping, impacts, stopping.name, `Tạm ngưng ${stopping.name}`);
    const outage: ResourceOutage = {
      id: `${fixture.tenant.id}-out-${(outageSequence += 1)}`,
      resourceId: stopping.id,
      from: startIso,
      to: toIso,
      reason: reason.trim(),
    };
    store.saveSettings({ config: { outages: [...outages, outage] } });
    toast({ text: `Đã tạm ngưng ${stopping.name}.${counts(placed.moved, placed.requeued)}` });
    setStopping(null);
  }

  function archive() {
    if (!archiving) return;
    const placed = place(archiving, archiveImpacts, archiving.name, `Ngừng dùng ${archiving.name}`);
    // Out of use for good is an outage with no end, so the booking and the calendar leave it alone.
    const outage: ResourceOutage = {
      id: `${fixture.tenant.id}-out-${(outageSequence += 1)}`,
      resourceId: archiving.id,
      from: placed.now,
      to: FOREVER,
      reason: 'Ngừng dùng',
    };
    store.saveSettings({
      resources: store.resources.map((r) =>
        r.id === archiving.id ? { ...r, archivedAt: placed.now } : r,
      ),
      config: { outages: [...outages, outage] },
    });
    toast({ text: `Đã ngừng dùng ${archiving.name}.${counts(placed.moved, placed.requeued)}` });
    setArchiving(null);
  }

  /** "Mở lại" ends the pause that runs; "Bỏ" drops one that has not begun (BR-93.25). */
  function reopen(r: Resource, outage: ResourceOutage) {
    const now = ctx().now;
    const running = outage.from <= now;
    store.saveSettings({
      config: {
        outages: running
          ? outages.map((o) => (o.id === outage.id ? { ...o, to: now } : o))
          : outages.filter((o) => o.id !== outage.id),
      },
    });
    toast({ text: running ? `Đã mở lại ${r.name}.` : 'Đã bỏ khoảng ngưng.' });
  }

  function move(r: Resource, dir: -1 | 1) {
    store.saveSettings({ resources: moveResource(store.resources, r.id, dir) });
  }

  const buttons = (r: Resource, size: 'sm' | 'md') => {
    const running = activeOutage(outages, r.id, MOCK_NOW);
    return (
      <>
        {running ? (
          <Button variant="ghost" size={size} onClick={() => reopen(r, running)}>
            Mở lại
          </Button>
        ) : (
          <Button variant="ghost" size={size} onClick={() => openStop(r)}>
            Tạm ngưng
          </Button>
        )}
        <Button variant="ghost" size={size} onClick={() => setArchiving(r)}>
          Ngừng dùng
        </Button>
      </>
    );
  };

  const orderButtons = (r: Resource) => (
    <span className="inline-flex gap-1">
      <button
        type="button"
        className="sp-icon-btn"
        aria-label={`Lên: ${r.name}`}
        disabled={!neighbour(store.resources, r.id, -1)}
        onClick={() => move(r, -1)}
      >
        <ArrowUp size={16} aria-hidden="true" />
      </button>
      <button
        type="button"
        className="sp-icon-btn"
        aria-label={`Xuống: ${r.name}`}
        disabled={!neighbour(store.resources, r.id, 1)}
        onClick={() => move(r, 1)}
      >
        <ArrowDown size={16} aria-hidden="true" />
      </button>
    </span>
  );

  const columns: Column<Resource>[] = [
    {
      key: 'order',
      width: '9%',
      label: 'Thứ tự',
      cell: (r) => (stateOf(r) === 'archived' ? null : orderButtons(r)),
    },
    {
      key: 'name',
      width: '14%',
      label: 'Tài nguyên',
      cell: (r) =>
        stateOf(r) === 'archived' ? (
          <span className="font-semibold text-(--ink-muted)">{r.name}</span>
        ) : (
          <button
            type="button"
            className="cursor-pointer border-0 bg-transparent p-0 text-left font-semibold text-(--ink) hover:text-(--brand)"
            onClick={() => setEditing(r)}
          >
            {r.name}
          </button>
        ),
    },
    { key: 'branch', width: '17%', label: 'Chi nhánh', cell: (r) => branchName(r.branchId) },
    {
      key: 'status',
      width: '18%',
      label: 'Trạng thái',
      cell: (r) => {
        const state = stateOf(r);
        if (state === 'archived') {
          return (
            <span className="flex flex-col items-start gap-1">
              <span className="sp-badge sp-badge--completed">Đã ngừng dùng</span>
              {!r.archivedAt && (
                <span className="sp-table__secondary">Chi nhánh đã ngừng dùng</span>
              )}
            </span>
          );
        }
        const now = activeOutage(outages, r.id, MOCK_NOW);
        const later = outages.filter((o) => o.resourceId === r.id && o.from > MOCK_NOW);
        return (
          <span className="flex flex-col items-start gap-1">
            {now ? (
              <span className="sp-badge sp-badge--pending">Bảo trì đến {dayMonth(now.to)}</span>
            ) : (
              <span className="sp-badge sp-badge--confirmed">Hoạt động</span>
            )}
            {later.map((o) => (
              <span key={o.id} className="sp-table__secondary">
                Ngưng {outageText(o)}{' '}
                <button
                  type="button"
                  className="cursor-pointer border-0 bg-transparent p-0 font-medium text-(--brand)"
                  aria-label={`Bỏ khoảng ngưng ${outageText(o)} của ${r.name}`}
                  onClick={() => reopen(r, o)}
                >
                  Bỏ
                </button>
              </span>
            ))}
          </span>
        );
      },
    },
    {
      key: 'count',
      width: '15%',
      label: 'Lịch 7 ngày tới',
      numeric: true,
      cell: (r) => (
        <span className="sp-num">{upcomingCount(fixture.appointments, r.id, MOCK_NOW)} lịch</span>
      ),
    },
    {
      key: 'actions',
      width: '27%',
      label: 'Thao tác',
      labelHidden: true,
      cell: (r) =>
        stateOf(r) === 'archived' ? null : <span className="flex gap-1">{buttons(r, 'sm')}</span>,
    },
  ];

  const nothingYet = owned.length === 0;

  return (
    <>
      <PageHeader
        crumbs={[{ label: 'Cài đặt', href: appHref('settings') }, { label: 'Tài nguyên' }]}
        title="Tài nguyên"
        sub={`${types.map((t) => t.name).join(', ')} mà dịch vụ cần`}
        actions={
          <>
            <Button
              onClick={() => {
                setStopping(null);
                setTypesOpen(true);
              }}
            >
              Loại tài nguyên
            </Button>
            <Button variant="primary" onClick={() => setEditing('new')}>
              <Plus size={16} aria-hidden="true" />
              Thêm tài nguyên
            </Button>
          </>
        }
      />
      <div className="sp-toolbar">
        {activeBranches.length >= 2 && (
          <ChipMenu
            label="Chi nhánh"
            value={branchFilter}
            allLabel="Tất cả"
            options={activeBranches.map((b) => ({ value: b.id, label: b.name }))}
            onChange={setBranchFilter}
          />
        )}
        <ChipMenu
          label="Loại"
          value={typeFilter}
          allLabel="Tất cả"
          options={types.map((t) => ({ value: t.id, label: t.name }))}
          onChange={setTypeFilter}
        />
        <ChipMenu
          label="Trạng thái"
          value={statusFilter}
          allLabel="Đang dùng"
          options={[
            { value: 'ok', label: 'Hoạt động' },
            { value: 'out', label: 'Đang bảo trì' },
            { value: 'archived', label: 'Đã ngừng dùng' },
          ]}
          onChange={setStatusFilter}
        />
      </div>
      <div className="flex items-start gap-(--space-5)">
        <section
          className="flex min-w-0 flex-auto flex-col gap-(--space-5)"
          aria-label="Tài nguyên"
        >
          {groups.length === 0 ? (
            <div className="sp-empty flex flex-col items-start gap-(--space-3)">
              {nothingYet ? (
                <>
                  <p className="m-0">
                    Chưa có tài nguyên nào. Thêm ghế, giường, phòng mà dịch vụ cần.
                  </p>
                  <Button variant="primary" onClick={() => setEditing('new')}>
                    Thêm tài nguyên
                  </Button>
                </>
              ) : (
                <>
                  <p className="m-0">Không có tài nguyên nào khớp.</p>
                  <Button
                    onClick={() => {
                      setBranchFilter('');
                      setTypeFilter('');
                      setStatusFilter('');
                    }}
                  >
                    Bỏ lọc
                  </Button>
                </>
              )}
            </div>
          ) : (
            groups.map(({ type, rows }) => (
              <section
                key={type.id}
                className="flex flex-col gap-(--space-2)"
                aria-label={type.name}
              >
                <h2 className="m-0 text-[15px] leading-6 font-semibold">
                  {type.name} · <span className="sp-num">{rows.length}</span>
                </h2>
                <DataTable
                  label={type.name}
                  columns={columns}
                  rows={rows}
                  rowKey={(r) => r.id}
                  minWidth={860}
                  cards={(r) => {
                    const state = stateOf(r);
                    return (
                      <div className="sp-cards__item">
                        <span className="sp-cards__body">
                          <span className="sp-cards__title">{r.name}</span>
                          <span className="sp-cards__meta">
                            {branchName(r.branchId)} ·{' '}
                            {state === 'archived'
                              ? 'Đã ngừng dùng'
                              : state === 'paused'
                                ? 'Đang bảo trì'
                                : 'Hoạt động'}{' '}
                            · {upcomingCount(fixture.appointments, r.id, MOCK_NOW)} lịch
                          </span>
                        </span>
                        {state !== 'archived' && (
                          <span className="flex flex-wrap items-center justify-end gap-1">
                            {orderButtons(r)}
                            {buttons(r, 'sm')}
                          </span>
                        )}
                      </div>
                    );
                  }}
                  foot={
                    <div className="sp-table-foot">
                      <span>{rows.length} tài nguyên</span>
                    </div>
                  }
                  phoneFoot={<p className="sp-table-foot m-0">{rows.length} tài nguyên</p>}
                />
              </section>
            ))
          )}
        </section>
        {stopping && (
          <SidePanel
            title={`Tạm ngưng ${stopping.name}`}
            onClose={() => setStopping(null)}
            footer={
              <>
                <Button onClick={() => setStopping(null)}>Hủy</Button>
                <Button variant="primary" disabled={problem !== null} onClick={stop}>
                  {stuck.length > 0 ? `Tạm ngưng, xếp lại ${stuck.length} lịch` : 'Tạm ngưng'}
                </Button>
              </>
            }
          >
            <div className="flex gap-3">
              <Field id="rs-f" label="Từ">
                <input
                  id="rs-f"
                  type="datetime-local"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                />
              </Field>
              <Field id="rs-to" label="Đến">
                <input
                  id="rs-to"
                  type="datetime-local"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                />
              </Field>
            </div>
            <Field id="rs-r" label="Lý do">
              <input
                id="rs-r"
                maxLength={200}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </Field>
            {problem && (
              <p role="status" className="sp-fit sp-fit--bad m-0">
                <span>{problem}</span>
              </p>
            )}
            <AffectedList
              resource={stopping}
              impacts={impacts}
              typeName={typeName(stopping.resourceTypeId)}
              L={L}
            />
          </SidePanel>
        )}
        {typesOpen && (
          <TypesPanel
            types={store.resourceTypes}
            resources={store.resources}
            services={fixture.services}
            onClose={() => setTypesOpen(false)}
            onChange={(next, text) => {
              store.saveSettings({ resourceTypes: next });
              if (text) toast({ text });
            }}
          />
        )}
      </div>

      {editing && (
        <ResourceDialog
          key={editing === 'new' ? 'new' : editing.id}
          resource={editing === 'new' ? null : editing}
          types={types}
          branches={activeBranches}
          defaultBranchId={branchFilter || activeBranches[0]?.id || store.branch.id}
          resources={store.resources}
          branchName={branchName}
          onClose={() => setEditing(null)}
          onSave={(name, typeId, branchId) => {
            const next: Resource[] =
              editing === 'new'
                ? [
                    ...store.resources,
                    {
                      id: `${fixture.tenant.id}-res-${store.resources.length + 1}`,
                      tenantId: fixture.tenant.id,
                      branchId,
                      resourceTypeId: typeId,
                      name,
                    },
                  ]
                : store.resources.map((r) => (r.id === editing.id ? { ...r, name } : r));
            store.saveSettings({ resources: next });
            toast({ text: editing === 'new' ? `Đã thêm ${name}.` : `Đã lưu ${name}.` });
            setEditing(null);
          }}
        />
      )}

      {archiving && (
        <ConfirmDialog
          open
          title={`Ngừng dùng ${archiving.name}?`}
          body="Tài nguyên không nhận lịch mới và không dùng lại được. Lịch đã đặt xử lý như tạm ngưng (BR-93.27)."
          confirmLabel="Ngừng dùng"
          backLabel="Quay lại"
          tone="danger"
          onClose={() => setArchiving(null)}
          onConfirm={archive}
        >
          <AffectedList
            resource={archiving}
            impacts={archiveImpacts}
            typeName={typeName(archiving.resourceTypeId)}
            L={L}
            compact
          />
        </ConfirmDialog>
      )}
    </>
  );
}

/** The appointments a pause or an archive touches, each with where it goes (BR-93.26). */
function AffectedList({
  resource,
  impacts,
  typeName,
  L,
  compact = false,
}: {
  resource: Resource;
  impacts: ReturnType<typeof outageImpact>;
  typeName: string;
  L: ReturnType<typeof lookups>;
  compact?: boolean;
}) {
  return (
    <section className="flex flex-col gap-[6px]" aria-label="Lịch bị ảnh hưởng">
      <h3 className="m-0 text-sm leading-5 font-semibold">
        {impacts.length === 0
          ? `Không có lịch nào dùng ${resource.name} trong khoảng này`
          : `${impacts.length} lịch dùng ${resource.name} trong khoảng này`}
      </h3>
      {impacts.length > 0 && (
        <ul className="sp-affected m-0">
          {impacts.map((i) => (
            <li key={i.appt.id} className="sp-affected__item">
              <span className="sp-num">{formatTime(i.appt.startAt)}</span> {L.who(i.appt)} ·{' '}
              {L.services(i.appt)} ·{' '}
              {[...new Set(i.appt.items.map((x) => L.name(x.staffResourceId)))].join(', ')}{' '}
              {i.moved ? (
                <span className="sp-fit sp-fit--ok">{i.after.join(', ')} trống</span>
              ) : (
                <span className="sp-fit sp-fit--bad">{i.reason}</span>
              )}
            </li>
          ))}
        </ul>
      )}
      {!compact && (
        <p className="m-0 text-[13px] leading-[18px] text-(--ink-muted)">
          Lịch có {typeName.toLowerCase()} khác trống thì tự chuyển, không cần báo khách. Lịch không
          còn chỗ vào "Cần xếp lại" (BR-35, BR-37). (Áp dụng khi có lịch hẹn.)
        </p>
      )}
    </section>
  );
}

/**
 * The small form to add a resource, or to rename one: the type and the branch are fixed once it
 * exists (BR-93.22).
 */
function ResourceDialog({
  resource,
  types,
  branches,
  defaultBranchId,
  resources,
  branchName,
  onSave,
  onClose,
}: {
  resource: Resource | null;
  types: ResourceType[];
  branches: Branch[];
  defaultBranchId: string;
  resources: Resource[];
  branchName: (id: string) => string;
  onSave: (name: string, typeId: string, branchId: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(resource?.name ?? '');
  const [typeId, setTypeId] = useState(resource?.resourceTypeId ?? types[0]?.id ?? '');
  const [branchId, setBranchId] = useState(resource?.branchId ?? defaultBranchId);
  const taken = resourceNameTaken(resources, branchId, name, resource?.id);
  const problem = cleanName(name) === '' ? 'Nhập tên.' : taken ? 'Tên này đã có.' : null;
  return (
    <ConfirmDialog
      open
      title={resource ? `Sửa ${resource.name}` : 'Thêm tài nguyên'}
      confirmLabel={resource ? 'Lưu' : 'Thêm'}
      backLabel="Hủy"
      confirmDisabled={problem !== null}
      onClose={onClose}
      onConfirm={() => onSave(cleanName(name), typeId, branchId)}
    >
      <Field id="rs-name" label="Tên" error={name !== '' ? problem : undefined}>
        <input id="rs-name" maxLength={50} value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      {resource ? (
        <p className="m-0 text-[13px] leading-[18px] text-(--ink-muted)">
          {types.find((t) => t.id === resource.resourceTypeId)?.name} ·{' '}
          {branchName(resource.branchId)}. Loại và chi nhánh không đổi sau khi tạo.
        </p>
      ) : (
        <>
          <Field id="rs-type" label="Loại" help="Loại tài nguyên của cơ sở.">
            <select id="rs-type" value={typeId} onChange={(e) => setTypeId(e.target.value)}>
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </Field>
          <Field id="rs-branch" label="Chi nhánh">
            <select id="rs-branch" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </Field>
        </>
      )}
    </ConfirmDialog>
  );
}

/** "Loại tài nguyên": add, rename, delete a type; the staff type has none of the three (BR-93.16 to BR-93.19). */
function TypesPanel({
  types,
  resources,
  services,
  onChange,
  onClose,
}: {
  types: ResourceType[];
  resources: Resource[];
  services: Parameters<typeof typeDeleteBlock>[2];
  onChange: (next: ResourceType[], toast?: string) => void;
  onClose: () => void;
}) {
  const [adding, setAdding] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<{ id: string; value: string } | null>(null);
  const [renameError, setRenameError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<ResourceType | null>(null);

  const used = (t: ResourceType) => resources.filter((r) => r.resourceTypeId === t.id);

  function add() {
    const name = cleanName(adding);
    if (name === '') return setAddError('Nhập tên loại.');
    if (typeNameTaken(types, name)) return setAddError('Đã có loại tên này.');
    onChange(
      [
        ...types,
        {
          id: `${types[0]?.tenantId ?? 'tenant'}-rt-${types.length + 1}`,
          tenantId: types[0]?.tenantId ?? '',
          name,
          isStaff: false,
        },
      ],
      `Đã thêm loại ${name}.`,
    );
    setAdding('');
    setAddError(null);
  }

  function rename() {
    if (!renaming) return;
    const name = cleanName(renaming.value);
    if (name === '') return setRenameError('Nhập tên loại.');
    if (typeNameTaken(types, name, renaming.id)) return setRenameError('Đã có loại tên này.');
    onChange(
      types.map((t) => (t.id === renaming.id ? { ...t, name } : t)),
      `Đã đổi tên thành ${name}.`,
    );
    setRenaming(null);
    setRenameError(null);
  }

  return (
    <SidePanel
      title="Loại tài nguyên"
      onClose={onClose}
      footer={<Button onClick={onClose}>Đóng</Button>}
    >
      <ul className="m-0 flex list-none flex-col gap-(--space-3) p-0">
        {types.map((t) => {
          const block = typeDeleteBlock(t, resources, services);
          const own = used(t);
          const archivedCount = own.filter((r) => r.archivedAt).length;
          return (
            <li key={t.id} className="flex flex-col gap-1">
              {renaming?.id === t.id ? (
                <div className="flex flex-col gap-2">
                  <Field
                    id={`rt-${t.id}`}
                    label={`Tên loại ${t.name}`}
                    error={renameError ?? undefined}
                  >
                    <input
                      id={`rt-${t.id}`}
                      maxLength={50}
                      value={renaming.value}
                      onChange={(e) => setRenaming({ id: t.id, value: e.target.value })}
                    />
                  </Field>
                  <span className="flex gap-2">
                    <Button size="sm" variant="primary" onClick={rename}>
                      Lưu
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        setRenaming(null);
                        setRenameError(null);
                      }}
                    >
                      Hủy
                    </Button>
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="min-w-0 flex-auto">
                    <strong className="flex items-center gap-1">
                      {t.isStaff && <Lock size={14} aria-hidden="true" />}
                      {t.name}
                    </strong>
                    <span className="sp-table__secondary">
                      {t.isStaff
                        ? 'Loại có sẵn, không sửa, không xóa'
                        : `${own.length - archivedCount} tài nguyên${
                            archivedCount > 0 ? `, ${archivedCount} đã ngừng dùng` : ''
                          }`}
                    </span>
                  </span>
                  {!t.isStaff && (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setRenaming({ id: t.id, value: t.name });
                          setRenameError(null);
                        }}
                      >
                        Đổi tên
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={block !== null}
                        title={block ?? undefined}
                        onClick={() => setDeleting(t)}
                      >
                        Xóa
                      </Button>
                    </>
                  )}
                </div>
              )}
              {!t.isStaff && block && renaming?.id !== t.id && (
                <span className="sp-table__secondary">Còn tài nguyên, không xóa được</span>
              )}
            </li>
          );
        })}
      </ul>
      <Field id="rt-new" label="Thêm loại" error={addError ?? undefined}>
        <input
          id="rt-new"
          maxLength={50}
          placeholder="Ví dụ: Bồn ngâm"
          value={adding}
          onChange={(e) => {
            setAdding(e.target.value);
            setAddError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
        />
      </Field>
      <Button variant="primary" onClick={add}>
        Thêm loại
      </Button>
      {deleting && (
        <ConfirmDialog
          open
          title={`Xóa loại ${deleting.name}?`}
          body="Loại chưa có tài nguyên nào nên xóa được."
          confirmLabel="Xóa"
          backLabel="Quay lại"
          tone="danger"
          onClose={() => setDeleting(null)}
          onConfirm={() => {
            onChange(
              types.filter((t) => t.id !== deleting.id),
              `Đã xóa loại ${deleting.name}.`,
            );
            setDeleting(null);
          }}
        />
      )}
    </SidePanel>
  );
}
