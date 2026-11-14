'use client';

import { useSearchParams } from 'next/navigation';
import { useScheduleStore } from '@/components/mock/schedule-store';
import { StatTile } from '@/components/mock/stat-tile';
import { useSubscription } from '@/components/mock/subscription-store';
import { useTechnician } from '@/components/mock/use-technician';
import { GatedPage } from '@/components/mock/locked-feature';
import { periodLabelOf, periodOfInstant, periodRange, periodState } from '@/mock/commission';
import { periodLines } from '@/mock/commission-view';
import { formatVnd } from '@/mock/format';
import { staffRoleOf } from '@/mock/selection';
import { formatFullDate, MOCK_NOW, MOCK_TODAY } from '@/mock/time';

/** How many recent lines the phone shows. */
const RECENT = 8;

/** `07/11`. */
const dm = (date: string) => `${date.slice(8, 10)}/${date.slice(5, 7)}`;

/** Hoa hồng tạm tính (MH-37): the technician's own commission in the open period, nobody else's (BR-44). */
export function MyCommissionScreen({ tenantSlug }: { tenantSlug: string }) {
  const { can } = useSubscription();
  if (!can('commission')) {
    return (
      <GatedPage
        feature="commission"
        tenantSlug={tenantSlug}
        path={['my', 'commission']}
        inSettings={false}
      />
    );
  }
  return <MyCommission />;
}

function MyCommission() {
  const me = useTechnician();
  const { money, customers } = useScheduleStore();
  const role = staffRoleOf(useSearchParams().get('role'));

  if (role !== 'technician') {
    return (
      <div className="sp-shell__content">
        <p className="sp-empty m-0">
          Màn này là hoa hồng của kỹ thuật viên đang đăng nhập. Chọn vai Kỹ thuật viên để xem.
        </p>
      </div>
    );
  }

  const periodId = periodOfInstant(MOCK_NOW);
  const period = money.periods.find((p) => p.id === periodId);
  const state = period ? periodState(period, MOCK_TODAY) : 'open';
  const lines = periodLines(money, periodId, me.resourceId);
  const total = lines.reduce((m, l) => m + l.amountVnd, 0n);
  const closeDay = formatFullDate(periodRange(periodId).to).slice(0, 5);

  // BR-36: the customer is named the way the calendar names them, never with a phone number.
  const textOf = (invoiceId: string, text: string, clawback: boolean) => {
    if (clawback) return text;
    const customerId = money.invoices.find((i) => i.id === invoiceId)?.customerId;
    const callName = customers.find((c) => c.id === customerId)?.callName;
    return callName ? `${text} · ${callName}` : text;
  };

  return (
    <div className="sp-shell__content">
      <div className="mx-auto flex w-full max-w-[640px] flex-col gap-(--space-4)">
        <div>
          <h1 className="sp-page-head__title">Hoa hồng</h1>
          <p className="sp-page-head__sub">
            {me.profile.displayName} · kỳ {periodLabelOf(periodId)},{' '}
            {state === 'open' ? 'đang mở' : 'đã hết, chờ chốt'}
          </p>
        </div>
        <StatTile
          big
          label="Tạm tính tới hôm nay"
          value={formatVnd(total)}
          note={`Số cuối cùng khi chủ tiệm chốt kỳ, sau ${closeDay}.`}
        />
        <section aria-labelledby="mc-l">
          <h2 id="mc-l" className="m-0 mb-1 text-[15px] leading-[22px] font-semibold">
            Gần đây
          </h2>
          {lines.length === 0 ? (
            <p className="sp-panel__note m-0">Chưa có khoản nào trong kỳ này.</p>
          ) : (
            <ul className="m-0 list-none p-0">
              {lines.slice(0, RECENT).map((l) => (
                <li key={l.id} className="flex justify-between gap-3 border-t border-(--line) py-3">
                  <span className="flex min-w-0 flex-col">
                    <span className="text-sm leading-5">
                      {textOf(l.invoiceId, l.text, l.clawback)}
                    </span>
                    <span className="sp-num text-[13px] leading-[18px] text-(--ink-muted)">
                      {dm(l.date)}
                    </span>
                  </span>
                  <span
                    className={`sp-num text-sm leading-5 font-semibold whitespace-nowrap ${
                      l.clawback ? 'text-(--danger)' : 'text-(--ink)'
                    }`}
                  >
                    {l.clawback ? `−${formatVnd(-l.amountVnd)}` : `+${formatVnd(l.amountVnd)}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <p className="m-0 text-[13px] leading-[18px] text-(--ink-muted)">
          Hoa hồng tính trên số tiền khách thực trả sau giảm giá. Tên khách không kèm số điện thoại
          (BR-36).
        </p>
      </div>
    </div>
  );
}
