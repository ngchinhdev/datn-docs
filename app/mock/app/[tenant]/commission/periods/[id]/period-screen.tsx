'use client';

import { Download } from 'lucide-react';
import Link from 'next/link';
import { GatedPage } from '@/components/mock/locked-feature';
import { useScheduleStore } from '@/components/mock/schedule-store';
import { StatRow, StatTile } from '@/components/mock/stat-tile';
import { useSubscription } from '@/components/mock/subscription-store';
import { useAppHref } from '@/components/mock/use-app-href';
import { useDesk } from '@/components/mock/use-desk';
import { useQueryState } from '@/components/mock/use-query-state';
import { Button } from '@/components/sapio/button';
import { PageHeader } from '@/components/sapio/page-header';
import { SegmentedTabs } from '@/components/sapio/segmented';
import { useToast } from '@/components/sapio/toast';
import { periodState, periodTotals } from '@/mock/commission';
import { periodCsv, periodLines, periodSpan } from '@/mock/commission-view';
import { formatVnd } from '@/mock/format';
import { lookups } from '@/mock/reception';
import { MOCK_TODAY } from '@/mock/time';

const STATE_TEXT = { open: 'đang mở', ended: 'hết kỳ, chưa chốt', closed: 'đã chốt' } as const;

/** `07/11`. */
const dm = (date: string) => `${date.slice(8, 10)}/${date.slice(5, 7)}`;

/** Kỳ hoa hồng của một người (MH-56): four figures and every line behind them. */
export function PeriodScreen({ tenantSlug, periodId }: { tenantSlug: string; periodId: string }) {
  const { can } = useSubscription();
  if (!can('commission')) {
    return (
      <GatedPage
        feature="commission"
        tenantSlug={tenantSlug}
        path={['commission', 'periods', periodId]}
        inSettings={false}
      />
    );
  }
  return <Period tenantSlug={tenantSlug} periodId={periodId} />;
}

function Period({ tenantSlug, periodId }: { tenantSlug: string; periodId: string }) {
  const { fixture } = useDesk(tenantSlug);
  const { money } = useScheduleStore();
  const appHref = useAppHref(tenantSlug);
  const toast = useToast();
  const L = lookups(fixture);
  const people = fixture.staff.map((s) => s.resourceId);
  const withLines = periodTotals(money.commission, periodId).map((t) => t.staffResourceId);
  const [picked, setPicked] = useQueryState('staff', '');
  const staffId = people.includes(picked) ? picked : (withLines[0] ?? people[0] ?? '');

  const period = money.periods.find((p) => p.id === periodId);
  if (!period) {
    return (
      <div className="sp-shell__content">
        <p className="sp-empty m-0">
          Không có kỳ này.{' '}
          <Link href={appHref('commission')} className="font-medium">
            Về Hoa hồng
          </Link>
        </p>
      </div>
    );
  }

  const state = periodState(period, MOCK_TODAY);
  const lines = periodLines(money, periodId, staffId);
  const sum = (pick: (l: (typeof lines)[number]) => boolean) =>
    lines.filter(pick).reduce((m, l) => m + l.amountVnd, 0n);
  const service = lines.filter((l) => !l.clawback && l.source === 'service');
  const retail = lines.filter((l) => !l.clawback && l.source === 'retail');
  const clawback = sum((l) => l.clawback);
  const total = sum(() => true);
  const upTo = state === 'open' ? dm(MOCK_TODAY) : null;
  const name = staffId ? L.name(staffId) : '';

  function exportCsv() {
    const csv = periodCsv({ periodLabel: period!.label, staffName: name, lines });
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `hoa-hong-${periodId}-${staffId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ text: 'Đã tải tệp CSV.' });
  }

  return (
    <div className="sp-shell__content sp-shell__content--wide">
      <PageHeader
        title={`Kỳ ${period.label} · ${name}`}
        sub={`${periodSpan(periodId)} · ${STATE_TEXT[state]}`}
        crumbs={[
          { label: 'Hoa hồng', href: appHref('commission') },
          { label: `Kỳ ${period.label}` },
        ]}
        actions={
          <Button variant="ghost" onClick={exportCsv}>
            <Download size={16} aria-hidden="true" />
            Xuất CSV
          </Button>
        }
      />
      <div className="sp-toolbar">
        <SegmentedTabs
          label="Nhân viên"
          items={people.map((id) => ({ value: id, label: L.name(id) }))}
          value={staffId}
          onChange={(value) => setPicked(value)}
        />
      </div>
      <StatRow>
        <StatTile
          label={state === 'closed' ? 'Tổng kỳ' : 'Tạm tính'}
          value={formatVnd(total)}
          note={upTo ? `tới ${upTo}` : state === 'closed' ? 'đã chốt' : 'kỳ đã hết, chờ chốt'}
        />
        <StatTile
          label="Từ dịch vụ"
          value={formatVnd(sum((l) => !l.clawback && l.source === 'service'))}
          note={`${service.length} dòng`}
        />
        <StatTile
          label="Từ bán lẻ"
          value={formatVnd(sum((l) => !l.clawback && l.source === 'retail'))}
          note={`${retail.length} dòng`}
        />
        <StatTile
          label="Thu hồi"
          value={clawback < 0n ? `−${formatVnd(-clawback)}` : formatVnd(0n)}
          tone={clawback < 0n ? 'bad' : 'muted'}
          note={clawback < 0n ? 'hoàn tiền hóa đơn đã thu' : 'chưa có'}
        />
      </StatRow>
      <section className="sp-panel" aria-labelledby="cp-l">
        <h2 className="sp-panel__title" id="cp-l">
          Các dòng
        </h2>
        {lines.length === 0 ? (
          <p className="sp-panel__note m-0">{name} chưa có khoản nào trong kỳ này.</p>
        ) : (
          <div
            className="sp-table-wrap"
            tabIndex={0}
            role="region"
            aria-label={`Dòng hoa hồng của ${name}, kỳ ${period.label}, cuộn được`}
          >
            <table className="sp-table">
              <caption className="sp-sr-only">
                Dòng hoa hồng của {name}, kỳ {period.label}
              </caption>
              <thead>
                <tr>
                  <th scope="col">Ngày</th>
                  <th scope="col">Hóa đơn</th>
                  <th scope="col">Dòng</th>
                  <th scope="col" className="sp-table__num">
                    Tính trên
                  </th>
                  <th scope="col" className="sp-table__num">
                    Tỉ lệ
                  </th>
                  <th scope="col" className="sp-table__num">
                    Hoa hồng
                  </th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l) => (
                  <tr key={l.id}>
                    <td>
                      <span className="sp-num">{dm(l.date)}</span>
                    </td>
                    <td>
                      <Link href={appHref(`invoices/${l.invoiceId}`)}>{l.invoiceNumber}</Link>
                    </td>
                    <td>
                      {l.clawback ? <span className="text-(--danger)">{l.text}</span> : l.text}
                    </td>
                    <td className="sp-table__num sp-num">
                      {l.baseVnd < 0n ? `−${formatVnd(-l.baseVnd)}` : formatVnd(l.baseVnd)}
                    </td>
                    <td className="sp-table__num sp-num">{l.percent}%</td>
                    <td className="sp-table__num sp-num">
                      {l.clawback ? (
                        <span className="text-(--danger)">−{formatVnd(-l.amountVnd)}</span>
                      ) : (
                        formatVnd(l.amountVnd)
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="sp-panel__note">
          Mỗi dòng gắn với một dòng hóa đơn. Khoản thu hồi ghi vào kỳ của ngày duyệt hoàn tiền; kỳ
          của hóa đơn gốc giữ nguyên (BR-42).
        </p>
      </section>
    </div>
  );
}
