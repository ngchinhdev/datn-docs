'use client';

import { PlanPurchase } from '@/components/mock/plan-purchase';
import { useSubscription } from '@/components/mock/subscription-store';
import { useAppHref } from '@/components/mock/use-app-href';
import { PageHeader } from '@/components/sapio/page-header';
import { formatVnd } from '@/mock/format';
import { fixtureBySlug } from '@/mock/selection';
import { plans } from '@/mock/subscription';
import { formatFullDate } from '@/mock/time';

/** Cài đặt › Gói Sapio (MH-61): where the tenant stands, the plans to buy, the payments so far. */
export function PlanScreen({ tenantSlug }: { tenantSlug: string }) {
  const appHref = useAppHref(tenantSlug);
  const { subscription, entitlements: e, daysLeft, payments, branches } = useSubscription();
  const tenant = fixtureBySlug(tenantSlug)?.tenant;
  const plan = plans[subscription.planCode];
  const trial = e.mode === 'trial';
  const end = formatFullDate((trial ? e.trialEndsOn : e.periodEndsOn) ?? '');
  const pending = subscription.pendingPlan ? plans[subscription.pendingPlan] : null;

  return (
    <>
      <PageHeader
        title="Gói Sapio"
        sub={`${tenant?.name} · ${branches} chi nhánh`}
        crumbs={[{ label: 'Cài đặt', href: appHref('settings') }, { label: 'Gói Sapio' }]}
      />

      <section className="sp-auth__card gap-(--space-2)!" aria-labelledby="pl-status">
        <div className="flex items-center justify-between gap-(--space-3)">
          <h2 id="pl-status" className="m-0 text-base leading-6 font-semibold">
            Trạng thái
          </h2>
          <span className={trial ? 'sp-badge sp-badge--pending' : 'sp-badge sp-badge--confirmed'}>
            {trial ? 'Dùng thử' : `Gói ${plan.name}`} · còn {daysLeft} ngày
          </span>
        </div>
        <p className="m-0 text-sm leading-5 text-(--ink-muted)">
          {trial
            ? `Đang dùng thử đủ tính năng của gói Chuyên nghiệp đến 23:59 ngày ${end}, chưa nhận đặt lịch. Kích hoạt lúc nào thì gói tính từ lúc đó. Hết hạn mà chưa kích hoạt thì tài khoản chỉ còn trang này.`
            : `Đang dùng gói ${plan.name} đến 23:59 ngày ${end}. Trang đặt lịch đang nhận khách.${
                pending
                  ? ` Từ kỳ sau chuyển sang gói ${pending.name}.`
                  : ' Gia hạn trước ngày hết hạn để không gián đoạn.'
              }`}
        </p>
      </section>

      <PlanPurchase heading="Chọn gói" headingId="pl-plans" />

      <section aria-labelledby="pl-history" className="flex flex-col gap-(--space-2)">
        <h2 id="pl-history" className="m-0 text-base leading-6 font-semibold">
          Lịch sử thanh toán
        </h2>
        {payments.length === 0 ? (
          <div className="sp-empty p-(--space-6)">
            Chưa có thanh toán nào. Sau khi kích hoạt, mỗi lần thanh toán, gia hạn và đổi gói hiện ở
            đây.
          </div>
        ) : (
          <div className="sp-table-wrap">
            <table className="sp-table">
              <thead>
                <tr>
                  <th scope="col" className="uppercase">
                    Ngày
                  </th>
                  <th scope="col" className="uppercase">
                    Nội dung
                  </th>
                  <th scope="col" className="sp-table__num uppercase">
                    Số tiền
                  </th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="sp-num">{formatFullDate(payment.date)}</td>
                    <td>{payment.label}</td>
                    <td className="sp-table__num sp-num">
                      {payment.amountVnd === 0n ? 'Không thu tiền' : formatVnd(payment.amountVnd)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
