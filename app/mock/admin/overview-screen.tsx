'use client';

import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';
import { useAccountStore } from '@/components/mock/account-store';
import { usePlatform, useTenantViews } from '@/components/mock/platform-store';
import { StatRow, StatTile } from '@/components/mock/stat-tile';
import { PageHeader } from '@/components/sapio/page-header';
import { formatVnd } from '@/mock/format';
import {
  STATE_BADGE,
  expiryBadge,
  expiryNote,
  lockedNote,
  overview,
  stateLabel,
  type TenantView,
} from '@/mock/platform';
import { formatFullDate, formatTime, localDate } from '@/mock/time';

const detailHref = (v: TenantView) => `/mock/admin/tenants/${v.tenant.id}`;

/** Tổng quan nền tảng (MH-60): totals only, never a customer of a tenant (BR-89). */
export function OverviewScreen() {
  const views = useTenantViews();
  const { catalog, payments } = usePlatform();
  const { now } = useAccountStore();
  const data = useMemo(
    () => overview(views, Object.values(payments).flat(), now),
    [views, payments, now],
  );
  const revenue = data.revenue;

  return (
    <div className="sp-shell__content sp-shell__content--wide">
      <PageHeader
        title="Tổng quan nền tảng"
        sub={`Số liệu đến ${formatTime(now)}, ${formatFullDate(localDate(now))}. Chỉ là số tổng, không có dữ liệu khách của cơ sở nào.`}
      />
      <StatRow>
        <StatTile
          label="Cơ sở"
          value={data.total}
          note={`+${data.createdSince} từ ${data.since.slice(8, 10)}/${data.since.slice(5, 7)}`}
        />
        <StatTile
          label="Đang trả phí"
          value={data.paid}
          note={`${data.paidByPlan.basic} ${catalog.plans.basic.name} · ${data.paidByPlan.pro} ${catalog.plans.pro.name}`}
        />
        <StatTile
          label="Dùng thử"
          value={data.trial}
          note={`${data.trialEndingSoon} hết trong 3 ngày tới`}
        />
        <StatTile
          label="Hết hạn, chưa gia hạn"
          value={data.expired}
          note="Dữ liệu vẫn giữ (BR-82)"
        />
        <StatTile
          label="Bị khóa"
          value={data.locked.count}
          note={lockedNote(data.locked)}
          tone={data.locked.count > 0 ? 'bad' : 'muted'}
        />
        <StatTile
          label={`Thu tháng ${revenue.month}`}
          value={formatVnd(revenue.amountVnd)}
          note={`${revenue.count} giao dịch · tính đến ${formatFullDate(revenue.upTo).slice(0, 5)}`}
        />
      </StatRow>
      <div className="flex flex-wrap items-stretch gap-(--space-4)">
        <div className="flex min-w-0 flex-[2_1_0] flex-col gap-(--space-4)">
          <section className="sp-panel" aria-labelledby="ov-new">
            <div className="flex items-center gap-2">
              <h2 className="sp-panel__title" id="ov-new">
                Cơ sở mới
              </h2>
              <div className="ms-auto">
                <Link
                  href="/mock/admin/tenants"
                  className="sp-btn sp-btn--ghost sp-btn--sm no-underline"
                >
                  Xem tất cả
                  <ArrowRight size={14} aria-hidden="true" />
                </Link>
              </div>
            </div>
            <div
              className="sp-table-wrap"
              tabIndex={0}
              role="region"
              aria-label="Cơ sở mới, cuộn được"
            >
              <table className="sp-table">
                <caption className="sp-sr-only">Cơ sở mới</caption>
                <thead>
                  <tr>
                    <th scope="col">Cơ sở</th>
                    <th scope="col">Tạo ngày</th>
                    <th scope="col">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {data.newest.map((v) => (
                    <tr key={v.tenant.id}>
                      <td>
                        <div className="sp-table__primary">
                          <span>
                            <Link href={detailHref(v)}>{v.tenant.name}</Link>
                            <span className="sp-table__secondary">{v.tenant.slug}.sapio.vn</span>
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className="sp-num">{formatFullDate(v.tenant.createdOn)}</span>
                      </td>
                      <td>
                        <span className={`sp-badge ${STATE_BADGE[v.state]}`}>{stateLabel(v)}</span>
                        {v.state === 'active' && (
                          <span className="text-[13px] text-(--ink-muted)">
                            {' '}
                            {catalog.plans[v.subscription.planCode].name}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
        <div className="flex min-w-0 flex-[1_1_0] flex-col gap-(--space-4)">
          <section className="sp-panel" aria-labelledby="ov-soon">
            <h2 className="sp-panel__title" id="ov-soon">
              Sắp hết hạn, đã hết hạn
            </h2>
            <ul className="m-0 flex list-none flex-col p-0">
              {data.expiring.map((v) => {
                const badge = expiryBadge(v);
                return (
                  <li
                    key={v.tenant.id}
                    className="flex items-center gap-3 border-t border-(--line) py-3"
                  >
                    <span className="flex min-w-0 flex-1 flex-col">
                      <Link href={detailHref(v)} className="text-sm leading-5 font-medium">
                        {v.tenant.name}
                      </Link>
                      <span className="text-[13px] leading-[18px] text-(--ink-muted)">
                        {expiryNote(v, catalog)}
                      </span>
                    </span>
                    <span className={`sp-badge ${badge.className}`}>{badge.text}</span>
                  </li>
                );
              })}
            </ul>
            <p className="sp-panel__note">
              Nhắc qua email do hệ thống gửi (BR-86); ở đây chỉ để biết.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
