'use client';

import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import { BarChart } from '@/components/mock/bar-chart';
import { useScheduleStore } from '@/components/mock/schedule-store';
import { StatRow, StatTile } from '@/components/mock/stat-tile';
import { useSubscription } from '@/components/mock/subscription-store';
import { useAppHref } from '@/components/mock/use-app-href';
import { useReportInput } from '@/components/mock/use-report-input';
import { PageHeader } from '@/components/sapio/page-header';
import { StatusBadge } from '@/components/sapio/status-badge';
import { formatPercentTenths, formatSigned, formatVnd } from '@/mock/format';
import { happeningNow, todaySummary, todoItems } from '@/mock/overview';
import { appointmentEnd, isLive, lookups } from '@/mock/reception';
import { changePercent, forecast, cashIn, noShows, occupancy, previousRange } from '@/mock/reports';
import { staffRoleOf } from '@/mock/selection';
import { addDays, formatRange, formatDay, MOCK_NOW, MOCK_TODAY, weekdayShort } from '@/mock/time';

/** `Thứ Bảy trước`: the same weekday a week ago. */
const WEEKDAY_NAME = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

/** Tổng quan (MH-41): four figures, the work waiting, what is on now and the next seven days. */
export function OverviewScreen({ tenantSlug }: { tenantSlug: string }) {
  const input = useReportInput(tenantSlug);
  const { leaves, requeues, money, appointments } = useScheduleStore();
  const { can } = useSubscription();
  const appHref = useAppHref(tenantSlug);
  const role = staffRoleOf(useSearchParams().get('role'));
  const { fixture } = input;
  const branch = fixture.branches[0]!;
  const L = useMemo(() => lookups(fixture as Parameters<typeof lookups>[0]), [fixture]);
  const today = MOCK_TODAY;

  const summary = todaySummary(appointments, today);
  const day = { from: today, to: today };
  const takenToday = cashIn(input, day).totalVnd;
  const weekAgo = addDays(today, -7);
  const takenThen = cashIn(input, { from: weekAgo, to: weekAgo }).totalVnd;
  const takenChange = changePercent(takenToday, takenThen);
  const fillToday = occupancy(input, day).percent;

  const last7 = { from: addDays(today, -6), to: today };
  const miss = noShows(input, last7);
  const missBefore = noShows(input, previousRange(last7));
  const missWorse =
    miss.rateTenths !== null &&
    missBefore.rateTenths !== null &&
    miss.rateTenths > missBefore.rateTenths;

  const todo = todoItems({
    leaves,
    requeues,
    money,
    appointments,
    nameOf: L.name,
    today,
    showCommission: role === 'owner' && can('commission'),
  });
  const now = happeningNow(
    appointments.filter((a) => isLive(a, MOCK_NOW)),
    { now: MOCK_NOW, today, endOf: appointmentEnd, limit: 6 },
  );
  const week = forecast(input, today, 7);
  const closedDays = week.filter((d) => d.closed);
  const lowDays = week.filter((d) => !d.closed && d.percent !== null && d.percent < 40);

  return (
    <div className="sp-shell__content sp-shell__content--wide">
      <PageHeader
        title="Tổng quan"
        sub={`${formatDay(today).replace(',', '')} · ${branch.name}`}
        actions={
          <Link href={appHref('reports')} className="sp-btn sp-btn--secondary no-underline">
            Xem báo cáo
          </Link>
        }
      />
      <StatRow>
        <StatTile
          label="Lịch hôm nay"
          value={summary.total}
          note={summary.text || 'Chưa có lịch'}
        />
        <StatTile
          label="Đã thu hôm nay"
          value={formatVnd(takenToday)}
          {...(takenChange === null
            ? {
                note: `Chưa có số ${WEEKDAY_NAME[new Date(`${today}T00:00:00Z`).getUTCDay()]} trước để so`,
              }
            : {
                note: `${formatSigned(takenChange)} so với ${WEEKDAY_NAME[new Date(`${today}T00:00:00Z`).getUTCDay()]} trước`,
                tone: takenChange >= 0 ? ('good' as const) : ('bad' as const),
              })}
        />
        <StatTile
          label="Lấp đầy hôm nay"
          value={fillToday === null ? '—' : `${fillToday}%`}
          note="giờ thợ có khách trên giờ trong ca"
        />
        <StatTile
          label="Không đến 7 ngày qua"
          value={`${miss.noShow} / ${miss.due}`}
          note={
            miss.rateTenths === null
              ? 'Chưa có lịch đến giờ'
              : `${formatPercentTenths(miss.rateTenths)}${
                  missBefore.rateTenths === null
                    ? ''
                    : ` · tuần trước ${formatPercentTenths(missBefore.rateTenths)}`
                }`
          }
          tone={missWorse ? 'bad' : 'muted'}
        />
      </StatRow>
      <div className="sp-detail">
        <div className="sp-detail__main flex min-w-0 flex-[1_1_560px] flex-col gap-5">
          <section className="sp-panel" aria-labelledby="ov-t">
            <div className="flex items-center gap-2">
              <h2 className="sp-panel__title" id="ov-t">
                Việc cần xử lý
              </h2>
              {todo.length > 0 && (
                <span className="sp-badge sp-badge--pending ml-auto">{todo.length}</span>
              )}
            </div>
            {todo.length === 0 ? (
              <p className="sp-panel__note m-0">Không có việc nào cần xử lý.</p>
            ) : (
              <ul className="m-0 flex list-none flex-col p-0">
                {todo.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center gap-3 border-t border-(--line) py-3"
                  >
                    <span className="flex min-w-0 flex-auto flex-col">
                      <span className="text-sm leading-5 font-medium">{item.title}</span>
                      <span className="text-[13px] leading-[18px] text-(--ink-muted)">
                        {item.sub}
                      </span>
                    </span>
                    <span className={`sp-badge sp-badge--${item.badge.tone}`}>
                      {item.badge.label}
                    </span>
                    <Link
                      href={appHref(item.href)}
                      className="sp-btn sp-btn--ghost sp-btn--sm no-underline"
                      aria-label={`Mở: ${item.title}`}
                    >
                      Mở
                      <ArrowRight size={14} aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="sp-panel" aria-labelledby="ov-n">
            <div className="flex items-center gap-2">
              <h2 className="sp-panel__title" id="ov-n">
                Đang diễn ra
              </h2>
              <Link href={appHref('calendar')} className="ml-auto text-sm leading-5 font-medium">
                Mở lịch
              </Link>
            </div>
            {now.length === 0 ? (
              <p className="sp-panel__note m-0">Không còn lịch nào hôm nay.</p>
            ) : (
              <div
                className="sp-table-wrap"
                tabIndex={0}
                role="region"
                aria-label="Đang diễn ra, cuộn được"
              >
                <table className="sp-table">
                  <caption className="sp-sr-only">Đang diễn ra</caption>
                  <thead>
                    <tr>
                      <th scope="col">Giờ</th>
                      <th scope="col">Khách</th>
                      <th scope="col">Người làm</th>
                      <th scope="col">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {now.map((a) => (
                      <tr key={a.id}>
                        <td>
                          <span className="sp-num">
                            {formatRange(a.startAt, appointmentEnd(a))}
                          </span>
                        </td>
                        <td>
                          {L.who(a)} · {L.services(a)}
                        </td>
                        <td>
                          {[...new Set(a.items.map((i) => L.name(i.staffResourceId)))].join(', ')}
                        </td>
                        <td>
                          <StatusBadge status={a.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
        <aside className="sp-detail__side flex-[0_0_440px]">
          <section className="sp-panel">
            <BarChart
              title="Lấp đầy 7 ngày tới"
              unit="% giờ trong ca"
              height={170}
              width={420}
              axisMax={100}
              series={[{ label: 'Lấp đầy', color: 'var(--brand)' }]}
              groups={week.map((d) => ({
                label: `${weekdayShort(d.date)} ${d.date.slice(8, 10)}`,
                values: [d.percent ?? 0],
                ...(d.closed ? { mark: 'Đóng' } : {}),
              }))}
            />
            <p className="sp-panel__note">
              {closedDays.length > 0
                ? `${closedDays
                    .map((d) => {
                      const special = branch.specialDays.find((s) => s.date === d.date);
                      return `${formatDay(d.date).replace(',', '')} đóng cửa${special ? ` ${special.note.toLowerCase()}` : ''}`;
                    })
                    .join('; ')}. `
                : ''}
              Ngày dưới 40% là gợi ý để chạy ưu đãi hoặc cho nhân viên nghỉ
              {lowDays.length > 0
                ? ` (${lowDays.map((d) => `${weekdayShort(d.date)} ${d.date.slice(8, 10)}`).join(', ')})`
                : ''}
              .
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
