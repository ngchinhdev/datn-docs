'use client';

import { Plus } from 'lucide-react';
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
import type { Resource, ResourceOutage } from '@/mock/fixtures';
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

/** Tài nguyên (MH-46): ghế, giường, phòng the services need (BR-03); take one out of use for a while (BR-37). */
export function ResourcesScreen({ tenantSlug }: { tenantSlug: string }) {
  const desk = useDesk(tenantSlug);
  const { fixture, ctx } = desk;
  const store = useScheduleStore();
  const appHref = useAppHref(tenantSlug);
  const toast = useToast();
  const L = useMemo(() => lookups(fixture), [fixture]);
  const [typeFilter, setTypeFilter] = useQueryState('type', '');
  const [statusFilter, setStatusFilter] = useQueryState('status', '');
  const [stopping, setStopping] = useState<Resource | null>(null);
  const [editing, setEditing] = useState<Resource | 'new' | null>(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [reason, setReason] = useState('');

  const types = fixture.resourceTypes.filter((t) => !t.isStaff);
  const branch = fixture.branches[0]!;
  const outages = fixture.config.outages;
  const rows = fixture.resources
    .filter((r) => types.some((t) => t.id === r.resourceTypeId))
    .filter((r) => !typeFilter || r.resourceTypeId === typeFilter)
    .filter((r) => {
      if (!statusFilter) return true;
      const out = Boolean(activeOutage(outages, r.id, MOCK_NOW));
      return statusFilter === 'out' ? out : !out;
    });
  const typeName = (id: string) => types.find((t) => t.id === id)?.name ?? '';

  const fromIso = validInput(from) ? fromInput(from) : null;
  const toIso = validInput(to) ? fromInput(to) : null;
  const impacts = useMemo(
    () =>
      stopping && fromIso && toIso && fromIso < toIso
        ? outageImpact({
            fixture,
            resourceId: stopping.id,
            from: fromIso,
            to: toIso,
            now: MOCK_NOW,
          })
        : [],
    [stopping, fromIso, toIso, fixture],
  );
  const stuck = impacts.filter((i) => !i.moved);
  const problem =
    !fromIso || !toIso
      ? 'Chọn giờ bắt đầu và kết thúc.'
      : fromIso >= toIso
        ? 'Giờ kết thúc phải sau giờ bắt đầu.'
        : toIso <= MOCK_NOW
          ? 'Khoảng ngưng phải còn tới sau bây giờ.'
          : reason.trim() === ''
            ? 'Nhập lý do.'
            : null;

  function openStop(r: Resource) {
    setStopping(r);
    setFrom(toInput(MOCK_NOW));
    setTo(toInput(new Date(Date.parse(MOCK_NOW) + 4 * 3_600_000).toISOString()));
    setReason('');
  }

  function stop() {
    if (!stopping || problem || !fromIso || !toIso) return;
    const now = ctx();
    const outage: ResourceOutage = {
      id: `${fixture.tenant.id}-out-${(outageSequence += 1)}`,
      resourceId: stopping.id,
      from: fromIso,
      to: toIso,
      reason: reason.trim(),
    };
    // BR-37: what fits another resource moves at once and the customer is not told.
    for (const i of impacts) if (i.moved) store.replaceAppointment(i.moved);
    if (stuck.length > 0) {
      store.addRequeues(
        branchRequeues(
          stuck.map((i) => i.appt),
          {
            kind: 'outage',
            label: stopping.name,
            reason: `Tạm ngưng ${stopping.name}`,
            resourceId: stopping.id,
          },
          now.now,
          (n) => `${fixture.tenant.id}-rq-out-${(requeueSequence += 1)}-${n}`,
        ),
      );
    }
    store.saveSettings(
      { config: { outages: [...outages, outage] } },
      {
        at: now.now,
        actor: { name: now.actor, role: now.role },
        entries: [
          {
            action: 'Tạm ngưng tài nguyên',
            object: stopping.name,
            href: 'settings/resources',
            detail: `${outageText(outage)} · ${outage.reason}; ${
              impacts.length - stuck.length
            } lịch tự chuyển, ${stuck.length} lịch cần xếp lại`,
          },
        ],
      },
    );
    toast({
      text: `Đã tạm ngưng ${stopping.name}.${
        impacts.length > 0
          ? ` ${impacts.length - stuck.length} lịch tự chuyển${
              stuck.length > 0 ? `, ${stuck.length} lịch vào "Cần xếp lại"` : ''
            }.`
          : ''
      }`,
    });
    setStopping(null);
  }

  function reopen(r: Resource) {
    const now = ctx();
    const current = activeOutage(outages, r.id, now.now);
    if (!current) return;
    store.saveSettings(
      {
        config: { outages: outages.map((o) => (o.id === current.id ? { ...o, to: now.now } : o)) },
      },
      {
        at: now.now,
        actor: { name: now.actor, role: now.role },
        entries: [
          {
            action: 'Mở lại tài nguyên',
            object: r.name,
            href: 'settings/resources',
            detail: `Kết thúc khoảng ngưng ${outageText(current)} · ${current.reason}`,
          },
        ],
      },
    );
    toast({ text: `Đã mở lại ${r.name}.` });
  }

  const columns: Column<Resource>[] = [
    {
      key: 'name',
      width: '26%',
      label: 'Tài nguyên',
      cell: (r) => (
        <div className="sp-table__primary">
          <span className="min-w-0">
            <button
              type="button"
              className="cursor-pointer border-0 bg-transparent p-0 text-left font-semibold text-(--ink) hover:text-(--brand)"
              onClick={() => setEditing(r)}
            >
              {r.name}
            </button>
            <span className="sp-table__secondary">{typeName(r.resourceTypeId)}</span>
          </span>
        </div>
      ),
    },
    { key: 'branch', width: '20%', label: 'Chi nhánh', cell: () => branch.name },
    {
      key: 'status',
      width: '24%',
      label: 'Trạng thái',
      cell: (r) => {
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
                Ngưng {outageText(o)}
              </span>
            ))}
          </span>
        );
      },
    },
    {
      key: 'count',
      width: '16%',
      label: 'Lịch 7 ngày tới',
      numeric: true,
      cell: (r) => (
        <span className="sp-num">{upcomingCount(fixture.appointments, r.id, MOCK_NOW)} lịch</span>
      ),
    },
    {
      key: 'actions',
      width: '14%',
      label: 'Thao tác',
      labelHidden: true,
      cell: (r) =>
        activeOutage(outages, r.id, MOCK_NOW) ? (
          <Button variant="ghost" size="sm" onClick={() => reopen(r)}>
            Mở lại
          </Button>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => openStop(r)}>
            Tạm ngưng
          </Button>
        ),
    },
  ];

  return (
    <>
      <PageHeader
        crumbs={[{ label: 'Cài đặt', href: appHref('settings') }, { label: 'Tài nguyên' }]}
        title="Tài nguyên"
        sub={`${
          fixture.template.name
        }: ${types.map((t) => t.name).join(', ')} mà dịch vụ cần (BR-03)`}
        actions={
          <Button variant="primary" onClick={() => setEditing('new')}>
            <Plus size={16} aria-hidden="true" />
            Thêm tài nguyên
          </Button>
        }
      />
      <div className="sp-toolbar">
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
          allLabel="Tất cả"
          options={[
            { value: 'ok', label: 'Hoạt động' },
            { value: 'out', label: 'Đang bảo trì' },
          ]}
          onChange={setStatusFilter}
        />
      </div>
      <div className="flex items-start gap-(--space-5)">
        <section className="min-w-0 flex-auto" aria-label="Tài nguyên">
          {rows.length === 0 ? (
            <div className="sp-empty flex flex-col items-start gap-(--space-3)">
              <p className="m-0">Không có tài nguyên nào khớp.</p>
              <Button
                onClick={() => {
                  setTypeFilter('');
                  setStatusFilter('');
                }}
              >
                Bỏ lọc
              </Button>
            </div>
          ) : (
            <DataTable
              label="Tài nguyên"
              columns={columns}
              rows={rows}
              rowKey={(r) => r.id}
              minWidth={720}
              cards={(r) => (
                <div className="sp-cards__item">
                  <span className="sp-cards__body">
                    <span className="sp-cards__title">{r.name}</span>
                    <span className="sp-cards__meta">
                      {typeName(r.resourceTypeId)} ·{' '}
                      {activeOutage(outages, r.id, MOCK_NOW) ? 'Đang bảo trì' : 'Hoạt động'} ·{' '}
                      {upcomingCount(fixture.appointments, r.id, MOCK_NOW)} lịch
                    </span>
                  </span>
                  {activeOutage(outages, r.id, MOCK_NOW) ? (
                    <Button size="sm" onClick={() => reopen(r)}>
                      Mở lại
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => openStop(r)}>
                      Tạm ngưng
                    </Button>
                  )}
                </div>
              )}
              foot={
                <div className="sp-table-foot">
                  <span>
                    {rows.length} tài nguyên · loại lấy từ gói ngành {fixture.template.name} (
                    {types.map((t) => t.name).join(', ')})
                  </span>
                </div>
              }
              phoneFoot={<p className="sp-table-foot m-0">{rows.length} tài nguyên</p>}
            />
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
            <Field id="rs-r" label="Lý do" error={problem && reason === '' ? undefined : undefined}>
              <input id="rs-r" value={reason} onChange={(e) => setReason(e.target.value)} />
            </Field>
            {problem && (
              <p role="status" className="sp-fit sp-fit--bad m-0">
                <span>{problem}</span>
              </p>
            )}
            <section className="flex flex-col gap-[6px]" aria-labelledby="rs-a">
              <h3 id="rs-a" className="m-0 text-sm leading-5 font-semibold">
                {impacts.length === 0
                  ? `Không có lịch nào dùng ${stopping.name} trong khoảng này`
                  : `${impacts.length} lịch dùng ${stopping.name} trong khoảng này`}
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
              <p className="m-0 text-[13px] leading-[18px] text-(--ink-muted)">
                Lịch có {typeName(stopping.resourceTypeId).toLowerCase()} khác trống thì tự chuyển,
                không cần báo khách. Lịch không còn chỗ vào "Cần xếp lại" (BR-35, BR-37).
              </p>
            </section>
          </SidePanel>
        )}
      </div>

      {editing && (
        <ResourceDialog
          key={editing === 'new' ? 'new' : editing.id}
          resource={editing === 'new' ? null : editing}
          types={types}
          existingNames={fixture.resources.map((r) => r.name)}
          onClose={() => setEditing(null)}
          onSave={(name, typeId) => {
            const now = ctx();
            const next: Resource[] =
              editing === 'new'
                ? [
                    ...store.resources,
                    {
                      id: `${fixture.tenant.id}-res-${store.resources.length + 1}`,
                      tenantId: fixture.tenant.id,
                      branchId: branch.id,
                      resourceTypeId: typeId,
                      name,
                    },
                  ]
                : store.resources.map((r) =>
                    r.id === editing.id ? { ...r, name, resourceTypeId: typeId } : r,
                  );
            store.saveSettings(
              { resources: next },
              {
                at: now.now,
                actor: { name: now.actor, role: now.role },
                entries: [
                  {
                    action: editing === 'new' ? 'Thêm tài nguyên' : 'Sửa tài nguyên',
                    object: name,
                    href: 'settings/resources',
                    detail:
                      editing === 'new'
                        ? typeName(typeId)
                        : `${editing.name} → ${name} · ${typeName(typeId)}`,
                  },
                ],
              },
            );
            toast({ text: editing === 'new' ? `Đã thêm ${name}.` : `Đã lưu ${name}.` });
            setEditing(null);
          }}
        />
      )}
    </>
  );
}

/** The small form to add or rename a resource. */
function ResourceDialog({
  resource,
  types,
  existingNames,
  onSave,
  onClose,
}: {
  resource: Resource | null;
  types: { id: string; name: string }[];
  existingNames: string[];
  onSave: (name: string, typeId: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(resource?.name ?? '');
  const [typeId, setTypeId] = useState(resource?.resourceTypeId ?? types[0]?.id ?? '');
  const taken = existingNames.some(
    (n) => n.toLowerCase() === name.trim().toLowerCase() && n !== resource?.name,
  );
  const problem = name.trim() === '' ? 'Nhập tên.' : taken ? 'Tên này đã có.' : null;
  return (
    <ConfirmDialog
      open
      title={resource ? `Sửa ${resource.name}` : 'Thêm tài nguyên'}
      confirmLabel={resource ? 'Lưu' : 'Thêm'}
      backLabel="Hủy"
      confirmDisabled={problem !== null}
      onClose={onClose}
      onConfirm={() => onSave(name.trim(), typeId)}
    >
      <Field id="rs-name" label="Tên" error={name !== '' ? problem : undefined}>
        <input id="rs-name" value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field id="rs-type" label="Loại" help="Loại lấy từ gói ngành.">
        <select id="rs-type" value={typeId} onChange={(e) => setTypeId(e.target.value)}>
          {types.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </Field>
    </ConfirmDialog>
  );
}
