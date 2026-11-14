'use client';

import { CircleAlert } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { PlanPurchase } from '@/components/mock/plan-purchase';
import { usePlatform } from '@/components/mock/platform-store';
import { useSubscription } from '@/components/mock/subscription-store';
import { useToast } from '@/components/sapio/toast';
import { AuthPage } from '@/components/sapio/signup-layout';
import type { TenantFixture } from '@/mock/fixtures';
import { formatPhone } from '@/mock/format';
import { lookups } from '@/mock/reception';
import { PLAN_OVERRIDES, planOverrideOf } from '@/mock/subscription';
import { formatFullDate, formatTime, localDate } from '@/mock/time';

const LIST_LIMIT = 10;

/** Appointments that start after the period ended, to read and phone the customers (BR-82). */
function bookingsAfter(fixture: TenantFixture, endsOn: string) {
  const L = lookups(fixture);
  return fixture.appointments
    .filter((a) => a.status === 'confirmed' && a.customerId && localDate(a.startAt) > endsOn)
    .sort((a, b) => a.startAt.localeCompare(b.startAt))
    .map((a) => {
      const customer = L.customer(a);
      return {
        id: a.id,
        when: `${formatFullDate(localDate(a.startAt)).slice(0, 5)}, ${formatTime(a.startAt)}`,
        customer: customer?.name ?? '',
        phone: customer ? formatPhone(customer.phone) : '',
        services: a.items
          .map((i) => {
            const v = L.variant(i.serviceVariantId);
            return v
              ? v.service.variants.length > 1
                ? `${v.service.name} · ${v.name}`
                : v.service.name
              : '';
          })
          .join(', '),
        staff: [...new Set(a.items.map((i) => L.name(i.staffResourceId)))].join(', '),
      };
    });
}

/**
 * Everything in the admin area when the plan has ended (BR-82): the plans to pay for, and the
 * appointments already booked after the end, read only. Nothing else opens until payment.
 */
export function ExpiredScreen({ fixture }: { fixture: TenantFixture }) {
  const { subscription } = useSubscription();
  const { catalog } = usePlatform();
  const toast = useToast();
  const plan = catalog.plans[subscription.planCode];
  const endsOn = subscription.periodEndsOn ?? subscription.trialEndsOn ?? '';
  const rows = bookingsAfter(fixture, endsOn);
  const initials = 'CN';
  const pathname = usePathname();
  const query = useSearchParams();
  const choice = planOverrideOf(query.get('plan')) ?? 'default';
  const planHref = (value: string) => {
    const params = new URLSearchParams(query);
    if (value === 'default') params.delete('plan');
    else params.set('plan', value);
    const text = params.toString();
    return text ? `${pathname}?${text}` : pathname;
  };

  return (
    <AuthPage
      maxWidth={880}
      top={
        <header className="sp-auth__top bg-(--surface-raised) shadow-[0_1px_0_var(--line)]">
          <span className="flex items-center gap-(--space-3)">
            <span className="sp-brand__name">Sapio</span>
            <span aria-hidden="true" className="text-(--ink-muted)">
              /
            </span>
            <span className="text-sm leading-5 font-semibold">{fixture.tenant.name}</span>
          </span>
          <span className="flex items-center gap-(--space-2)">
            <span className="sp-avatar sp-avatar--sm" aria-hidden="true">
              {initials}
            </span>
            <button
              type="button"
              className="sp-btn sp-btn--ghost sp-btn--sm"
              onClick={() => toast({ text: 'Đăng xuất: chưa có trong mock.' })}
            >
              Đăng xuất
            </button>
          </span>
        </header>
      }
    >
      <div className="flex flex-col gap-(--space-2) pt-(--space-6)">
        <div className="flex items-center gap-(--space-3)">
          <CircleAlert size={32} aria-hidden="true" className="flex-none text-(--status-no-show)" />
          <h1 className="sp-auth__title">Gói của {fixture.tenant.name} đã hết hạn</h1>
        </div>
        <p className="sp-auth__lead m-0!">
          Gói {plan.name} hết hạn lúc 23:59 ngày {formatFullDate(endsOn)}. Trang đặt lịch đã ngừng
          nhận khách, khu quản trị tạm khóa. Dữ liệu vẫn được giữ nguyên; thanh toán xong là dùng
          tiếp ngay.
        </p>
      </div>

      <PlanPurchase heading="Gia hạn để dùng tiếp" headingId="ex-plans" />

      <section aria-labelledby="ex-list" className="flex flex-col gap-(--space-2)">
        <div>
          <h2 id="ex-list" className="m-0 text-base leading-6 font-semibold">
            {rows.length} lịch hẹn đã đặt sau ngày hết hạn
          </h2>
          <p className="sp-field__help m-0 mt-0.5">
            Chỉ để xem. Gọi báo khách nếu chưa gia hạn kịp; khách vẫn tự xem và hủy được lịch của
            mình.
            {rows.length > LIST_LIMIT && ` Hiện ${LIST_LIMIT} lịch gần nhất.`}
          </p>
        </div>
        <div className="sp-table-wrap max-md:hidden">
          <table className="sp-table table-fixed">
            <thead>
              <tr>
                {[
                  'Giờ hẹn',
                  'Khách',
                  'Số điện thoại',
                  'Dịch vụ',
                  fixture.template.vocabulary.staff,
                ].map((label) => (
                  <th key={label} scope="col" className="uppercase">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, LIST_LIMIT).map((row) => (
                <tr key={row.id}>
                  <td className="sp-num text-left!">{row.when}</td>
                  <td>
                    <strong className="font-semibold">{row.customer}</strong>
                  </td>
                  <td className="sp-num">{row.phone}</td>
                  <td>{row.services}</td>
                  <td>{row.staff}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul className="sp-cards md:hidden!" aria-label="Lịch hẹn đã đặt sau ngày hết hạn">
          {rows.slice(0, LIST_LIMIT).map((row) => (
            <li key={row.id} className="sp-cards__item flex-col items-start gap-1 text-left">
              <span className="sp-num text-sm font-semibold">
                {row.when} · {row.customer}
              </span>
              <span className="sp-num text-sm text-(--ink-muted)">{row.phone}</span>
              <span className="text-sm">
                {row.services} · {row.staff}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <nav
        aria-label="Đổi trạng thái gói của mock"
        className="flex flex-wrap items-center gap-x-(--space-3) gap-y-(--space-1) text-[13px] leading-[18px] text-(--ink-muted)"
      >
        <span>Xem mock với gói:</span>
        {[{ value: 'default', label: 'Mặc định' }, ...PLAN_OVERRIDES].map((option) => (
          <Link
            key={option.value}
            href={planHref(option.value)}
            aria-current={option.value === choice ? 'true' : undefined}
            className="font-medium aria-[current=true]:text-(--ink)"
          >
            {option.label}
          </Link>
        ))}
      </nav>
    </AuthPage>
  );
}
