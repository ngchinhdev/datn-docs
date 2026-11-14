'use client';

import { ChevronRight, Lock } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import { usePlatform, useTenantViews } from '@/components/mock/platform-store';
import { DataTable, type Column } from '@/components/sapio/data-table';
import { ChipMenu, FilterChip, SearchField } from '@/components/sapio/filters';
import { PageHeader } from '@/components/sapio/page-header';
import { TableFoot } from '@/components/sapio/pagination';
import {
  INDUSTRY_IDS,
  INDUSTRY_LABEL,
  STATE_BADGE,
  filterTenants,
  paginate,
  stateLabel,
  type PlatformState,
  type TenantView,
} from '@/mock/platform';
import type { IndustryId } from '@/mock/fixtures/platform';
import { PLAN_CODES, type PlanCode } from '@/mock/subscription';
import { formatFullDate } from '@/mock/time';

const SIZES = [9, 18] as const;
const STATES: { value: PlatformState; label: string }[] = [
  { value: 'active', label: 'Đang dùng' },
  { value: 'trial', label: 'Dùng thử' },
  { value: 'expired', label: 'Hết hạn' },
];

const pick = <T extends string>(value: string, allowed: readonly T[]): '' | T =>
  allowed.find((a) => a === value) ?? '';

function LockedMark() {
  return (
    <span className="inline-flex items-center gap-1 text-xs leading-4 font-semibold text-(--danger)">
      <Lock size={14} aria-hidden="true" />
      Bị khóa
    </span>
  );
}

/** Khách thuê (MH-58): every tenant of the platform; the filters live in the URL. */
export function TenantListScreen() {
  const views = useTenantViews();
  const { catalog } = usePlatform();
  const pathname = usePathname();
  const params = useSearchParams();
  const router = useRouter();
  const q = params.get('q') ?? '';
  const state = pick(
    params.get('state') ?? '',
    STATES.map((s) => s.value),
  );
  const plan = pick<PlanCode>(params.get('plan') ?? '', PLAN_CODES);
  const industry = pick<IndustryId>(params.get('industry') ?? '', INDUSTRY_IDS);
  const lockedOnly = params.get('locked') === '1';
  const size = SIZES.find((s) => String(s) === params.get('size')) ?? SIZES[0];

  /** Every filter lives in the URL; changing one sends the list back to the first page. */
  const change = (changes: Record<string, string>) => {
    const next = new URLSearchParams(params);
    next.delete('page');
    for (const [key, value] of Object.entries(changes)) {
      if (value === '') next.delete(key);
      else next.set(key, value);
    }
    const query = next.toString();
    router.replace(query ? pathname + '?' + query : pathname, { scroll: false });
  };

  const rows = useMemo(
    () => filterTenants(views, { q, state, plan, industry, lockedOnly }),
    [views, q, state, plan, industry, lockedOnly],
  );
  const page = paginate(rows, Number(params.get('page')) || 1, size);

  const hrefFor = (n: number) => {
    const next = new URLSearchParams(params);
    if (n <= 1) next.delete('page');
    else next.set('page', String(n));
    const query = next.toString();
    return query ? `${pathname}?${query}` : pathname;
  };

  const open = (v: TenantView) => `/mock/admin/tenants/${v.tenant.id}`;
  const endText = (v: TenantView) => (v.endsOn ? formatFullDate(v.endsOn) : '—');

  const columns: Column<TenantView>[] = [
    {
      key: 'name',
      label: 'Cơ sở',
      width: '24%',
      cell: (v) => (
        <div className="sp-table__primary">
          <span>
            <Link href={open(v)}>{v.tenant.name}</Link>
            <span className="sp-table__secondary">{v.tenant.slug}.sapio.vn</span>
          </span>
        </div>
      ),
    },
    {
      key: 'industry',
      label: 'Ngành',
      width: '12%',
      cell: (v) => INDUSTRY_LABEL[v.tenant.industry],
    },
    {
      key: 'plan',
      label: 'Gói',
      width: '12%',
      cell: (v) => catalog.plans[v.subscription.planCode].name,
    },
    {
      key: 'state',
      label: 'Trạng thái',
      width: '17%',
      cell: (v) => (
        <>
          <span className={`sp-badge ${STATE_BADGE[v.state]}`}>{stateLabel(v)}</span>
          {v.lock && (
            <>
              {' '}
              <LockedMark />
            </>
          )}
        </>
      ),
    },
    {
      key: 'ends',
      label: 'Hạn',
      width: '10%',
      cell: (v) => <span className="sp-num">{endText(v)}</span>,
    },
    { key: 'owner', label: 'Chủ cơ sở', width: '15%', cell: (v) => v.tenant.ownerEmail },
    {
      key: 'created',
      label: 'Tạo ngày',
      width: '10%',
      cell: (v) => <span className="sp-num">{formatFullDate(v.tenant.createdOn)}</span>,
    },
  ];

  const summary =
    page.total === 0 ? '0 cơ sở' : `Hiển thị ${page.from}–${page.to} trong ${page.total} cơ sở`;
  const reset = () => change({ q: '', state: '', plan: '', industry: '', locked: '' });

  return (
    <div className="sp-shell__content sp-shell__content--wide">
      <PageHeader
        title="Khách thuê"
        sub={`${views.length} cơ sở trên Sapio. Mở một cơ sở để gia hạn thủ công hoặc khóa.`}
      />
      <div className="sp-toolbar">
        <SearchField
          label="Tìm cơ sở"
          placeholder="Tên, địa chỉ trang hoặc email chủ cơ sở"
          value={q}
          onChange={(v) => change({ q: v })}
        />
        <ChipMenu
          label="Trạng thái"
          value={state}
          allLabel="Tất cả"
          options={STATES}
          onChange={(v) => change({ state: v })}
        />
        <ChipMenu
          label="Gói"
          value={plan}
          allLabel="Tất cả"
          options={PLAN_CODES.map((code) => ({ value: code, label: catalog.plans[code].name }))}
          onChange={(v) => change({ plan: v })}
        />
        <ChipMenu
          label="Ngành"
          value={industry}
          allLabel="Tất cả"
          options={INDUSTRY_IDS.map((id) => ({ value: id, label: INDUSTRY_LABEL[id] }))}
          onChange={(v) => change({ industry: v })}
        />
        <FilterChip pressed={lockedOnly} onToggle={() => change({ locked: lockedOnly ? '' : '1' })}>
          Bị khóa
        </FilterChip>
      </div>
      {rows.length === 0 ? (
        <div className="sp-empty flex flex-col items-start gap-(--space-3)">
          <p className="m-0">Không có cơ sở nào khớp. Thử bỏ bớt bộ lọc.</p>
          <button type="button" className="sp-btn sp-btn--secondary" onClick={reset}>
            Bỏ lọc
          </button>
        </div>
      ) : (
        <DataTable
          label="Danh sách cơ sở"
          columns={columns}
          rows={page.rows}
          rowKey={(v) => v.tenant.id}
          minWidth={980}
          cards={(v) => (
            <Link href={open(v)} className="sp-cards__item">
              <span className="sp-cards__body">
                <span className="sp-cards__title">{v.tenant.name}</span>
                <span className="sp-cards__meta">
                  {INDUSTRY_LABEL[v.tenant.industry]} ·{' '}
                  {catalog.plans[v.subscription.planCode].name} · {stateLabel(v)}
                  {v.lock && ' · Bị khóa'}
                </span>
                <span className="sp-cards__meta">
                  Hạn {endText(v)} · {v.tenant.ownerEmail}
                </span>
              </span>
              <ChevronRight size={16} aria-hidden="true" className="text-(--ink-muted)" />
            </Link>
          )}
          foot={
            <TableFoot
              summary={summary}
              page={page.page}
              pages={page.pages}
              hrefFor={hrefFor}
              size={size}
              sizes={SIZES}
              onSize={(n) => change({ size: n === SIZES[0] ? '' : String(n) })}
            />
          }
          phoneFoot={<p className="sp-table-foot m-0">{summary}</p>}
        />
      )}
      <p className="m-0 text-[13px] leading-[18px] text-(--ink-muted)">
        &ldquo;Hạn&rdquo; là ngày cuối của dùng thử hoặc của kỳ đã trả, dùng đến 23:59 giờ của cơ
        sở. Khóa (BR-75) là việc của quản trị nền tảng, không phải trạng thái gói: cơ sở bị khóa vẫn
        giữ gói và hạn.
      </p>
    </div>
  );
}
