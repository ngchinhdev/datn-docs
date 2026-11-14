'use client';

import { Download } from 'lucide-react';
import { useMemo } from 'react';
import { BarChart } from '@/components/mock/bar-chart';
import { GatedPage } from '@/components/mock/locked-feature';
import { StatRow, StatTile } from '@/components/mock/stat-tile';
import { useScheduleStore } from '@/components/mock/schedule-store';
import { useSubscription } from '@/components/mock/subscription-store';
import { useDesk } from '@/components/mock/use-desk';
import { useQueryState } from '@/components/mock/use-query-state';
import { useReportInput } from '@/components/mock/use-report-input';
import { Button } from '@/components/sapio/button';
import { PageHeader } from '@/components/sapio/page-header';
import { SegmentedTabs } from '@/components/sapio/segmented';
import { useToast } from '@/components/sapio/toast';
import { formatPercentTenths, formatSigned, formatVnd } from '@/mock/format';
import { initialsOfName } from '@/mock/people-format';
import {
  reportData,
  chooseRange,
  compareText,
  noShowNote,
  rangeText,
  reportCsv,
  type RangeKind,
} from '@/mock/report-view';
import { lookups } from '@/mock/reception';
import { roleLabel } from '@/mock/selection';
import { MOCK_TODAY } from '@/mock/time';

const KINDS: { value: RangeKind; label: string }[] = [
  { value: 'today', label: 'Hôm nay' },
  { value: '7', label: '7 ngày' },
  { value: 'month', label: 'Tháng này' },
  { value: 'custom', label: 'Tùy chọn' },
];

/** Báo cáo (MH-55): five figures against the stretch before, by day, by person, by service. */
export function ReportsScreen({ tenantSlug }: { tenantSlug: string }) {
  const { can } = useSubscription();
  if (!can('full_reports')) {
    return (
      <GatedPage
        feature="full_reports"
        tenantSlug={tenantSlug}
        path={['reports']}
        inSettings={false}
      />
    );
  }
  return <Reports tenantSlug={tenantSlug} />;
}

function Reports({ tenantSlug }: { tenantSlug: string }) {
  const input = useReportInput(tenantSlug);
  const desk = useDesk(tenantSlug);
  const store = useScheduleStore();
  const toast = useToast();
  const { fixture } = input;
  const branch = fixture.branches[0]!;
  const L = useMemo(() => lookups(fixture as Parameters<typeof lookups>[0]), [fixture]);
  const [kindText, setKind] = useQueryState('range', 'month');
  const [fromText, setFrom] = useQueryState('from', '');
  const [toText, setTo] = useQueryState('to', '');
  const kind = KINDS.some((k) => k.value === kindText) ? (kindText as RangeKind) : 'month';

  const { range, previous } = chooseRange(kind, MOCK_TODAY, { from: fromText, to: toText });
  const data = useMemo(() => reportData(input, range, previous), [input, range, previous]);
  const f = data.figures;

  const revenueTotal = data.staff.reduce((m, s) => m + s.revenueVnd, 0n);
  const tone = (n: number | null) => (n === null ? 'muted' : n >= 0 ? 'good' : 'bad');

  function exportCsv() {
    const csv = reportCsv({ branchName: branch.name, range, data, nameOf: L.name });
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `bao-cao-${range.from}-${range.to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    store.saveSettings(
      {},
      {
        at: desk.now(),
        actor: { name: desk.actor, role: roleLabel(desk.role) },
        entries: [
          {
            action: 'Xuất báo cáo',
            object: 'Báo cáo',
            href: 'reports',
            detail: `CSV, ${rangeText(range)}, doanh thu thực hiện ${formatVnd(f.revenueVnd)}`,
          },
        ],
      },
    );
    toast({ text: 'Đã tải tệp CSV và ghi vào nhật ký.' });
  }

  return (
    <div className="sp-shell__content sp-shell__content--wide">
      <PageHeader
        title="Báo cáo"
        actions={
          <Button variant="ghost" onClick={exportCsv}>
            <Download size={16} aria-hidden="true" />
            Xuất CSV
          </Button>
        }
      />
      <div className="sp-toolbar">
        <SegmentedTabs
          label="Khoảng ngày"
          items={KINDS}
          value={kind}
          onChange={(value) => setKind(value)}
        />
        <span className="sp-chip" aria-label="Chi nhánh">
          Chi nhánh <span className="sp-chip__value">{branch.name}</span>
        </span>
        {kind === 'custom' && (
          <span className="flex items-center gap-2 text-[13px] text-(--ink-muted)">
            <input
              type="date"
              aria-label="Từ ngày"
              value={range.from}
              max={MOCK_TODAY}
              onChange={(e) => setFrom(e.target.value)}
            />
            –
            <input
              type="date"
              aria-label="Đến ngày"
              value={range.to}
              max={MOCK_TODAY}
              onChange={(e) => setTo(e.target.value)}
            />
          </span>
        )}
        <span className="text-[13px] leading-[18px] text-(--ink-muted)">
          {rangeText(range)} · so với {compareText(previous)}
        </span>
      </div>

      <StatRow>
        <StatTile
          label="Doanh thu thực hiện"
          value={formatVnd(f.revenueVnd)}
          tone={tone(f.revenueChange)}
          note={`${f.revenueChange === null ? '' : `${formatSigned(f.revenueChange)} · `}dịch vụ đã làm, bán lẻ, buổi gói đã dùng`}
        />
        <StatTile
          label="Tiền thu vào"
          value={formatVnd(f.cash.totalVnd)}
          note={`gồm ${formatVnd(f.cash.prepaidVnd)} bán gói, nạp ví, cọc mới`}
        />
        <StatTile
          label="Tiền trả trước còn giữ"
          value={formatVnd(f.held.totalVnd)}
          note={`gói chưa dùng ${formatVnd(f.held.packagesVnd)}, ví ${formatVnd(f.held.walletVnd)}`}
        />
        <StatTile
          label="Lấp đầy"
          value={f.fill.percent === null ? '—' : `${f.fill.percent}%`}
          {...(f.fill.points === null
            ? {}
            : {
                note: `${f.fill.points === 0 ? 'bằng khoảng trước' : formatSigned(f.fill.points, ' điểm')}`,
                tone: tone(f.fill.points),
              })}
        />
        <StatTile
          label="Không đến"
          value={`${f.noShows.noShow} / ${f.noShows.due}`}
          note={noShowNote(f.noShows)}
        />
      </StatRow>

      <section className="sp-panel">
        <BarChart
          title="Theo ngày"
          unit="triệu ₫"
          series={[
            { label: 'Doanh thu thực hiện', color: 'var(--brand)' },
            { label: 'Tiền thu vào', color: 'var(--status-confirmed)' },
          ]}
          groups={data.days.map((d) => ({
            label: `${d.date.slice(8, 10)}/${d.date.slice(5, 7)}`,
            values: [Number(d.revenueVnd) / 1_000_000, Number(d.cashInVnd) / 1_000_000],
          }))}
        />
        <p className="sp-panel__note">
          Tiền thu vào khác doanh thu: bán gói, nạp ví là tiền trả trước, chỉ thành doanh thu khi
          dùng (BR-26). Hoàn tiền trừ vào ngày duyệt.
        </p>
      </section>

      <section className="sp-panel" aria-labelledby="rp-s">
        <h2 className="sp-panel__title" id="rp-s">
          Theo nhân viên
        </h2>
        <div
          className="sp-table-wrap"
          tabIndex={0}
          role="region"
          aria-label="Theo nhân viên, cuộn được"
        >
          <table className="sp-table">
            <caption className="sp-sr-only">Theo nhân viên</caption>
            <thead>
              <tr>
                <th scope="col">Nhân viên</th>
                <th scope="col" className="sp-table__num">
                  Lịch
                </th>
                <th scope="col" className="sp-table__num">
                  Doanh thu thực hiện
                </th>
                <th scope="col" className="sp-table__num">
                  Lấp đầy
                </th>
                <th scope="col" className="sp-table__num">
                  Không đến
                </th>
                <th scope="col" className="sp-table__num">
                  Hoa hồng tạm tính
                </th>
              </tr>
            </thead>
            <tbody>
              {data.staff.map((s) => {
                const member = fixture.staff.find((m) => m.resourceId === s.staffResourceId);
                const name = s.staffResourceId ? L.name(s.staffResourceId) : 'Không gắn ai';
                return (
                  <tr key={s.staffResourceId ?? 'none'}>
                    <td>
                      <div className="sp-table__primary">
                        <span className="sp-avatar sp-avatar--sm">{initialsOfName(name)}</span>
                        <span>
                          {name}
                          {member && (
                            <span className="sp-table__secondary">{member.profile.title}</span>
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="sp-table__num sp-num">{s.appointments}</td>
                    <td className="sp-table__num sp-num">{formatVnd(s.revenueVnd)}</td>
                    <td className="sp-table__num sp-num">
                      {s.occupancyPercent === null ? '—' : `${s.occupancyPercent}%`}
                    </td>
                    <td className="sp-table__num sp-num">{s.noShows}</td>
                    <td className="sp-table__num sp-num">{formatVnd(s.commissionVnd)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row">Tổng</th>
                <td />
                <td className="sp-table__num sp-num font-semibold">{formatVnd(revenueTotal)}</td>
                <td />
                <td />
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="sp-panel__note">
          Lấp đầy = phút đang làm cho khách ÷ phút trong ca. Đoạn chờ không tính là đang làm.
        </p>
      </section>

      <section className="sp-panel" aria-labelledby="rp-v">
        <h2 className="sp-panel__title" id="rp-v">
          Theo dịch vụ
        </h2>
        <div
          className="sp-table-wrap"
          tabIndex={0}
          role="region"
          aria-label="Theo dịch vụ, cuộn được"
        >
          <table className="sp-table">
            <caption className="sp-sr-only">Theo dịch vụ</caption>
            <thead>
              <tr>
                <th scope="col">Dịch vụ</th>
                <th scope="col" className="sp-table__num">
                  Lượt
                </th>
                <th scope="col" className="sp-table__num">
                  Doanh thu thực hiện
                </th>
                <th scope="col" className="sp-table__num">
                  Phần trăm
                </th>
              </tr>
            </thead>
            <tbody>
              {data.services.map((s) => (
                <tr key={s.label}>
                  <td>{s.label}</td>
                  <td className="sp-table__num sp-num">{s.count}</td>
                  <td className="sp-table__num sp-num">{formatVnd(s.revenueVnd)}</td>
                  <td className="sp-table__num sp-num">{s.percent}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="sp-panel__note">
          Buổi gói đã dùng tính vào dịch vụ của buổi đó, theo doanh thu của buổi (BR-26).
          {f.noShows.rateTenths !== null &&
            ` Không đến ${formatPercentTenths(f.noShows.rateTenths)} số lịch đã tới giờ.`}
        </p>
      </section>
    </div>
  );
}
