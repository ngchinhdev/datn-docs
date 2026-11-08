'use client';

import { useSearchParams } from 'next/navigation';
import { BookingFlow } from './booking-flow';
import { PLAN_NOW, entitlements, mockSubscription, planOverrideOf } from '@/mock/subscription';
import { fixtureBySlug } from '@/mock/selection';

/**
 * The customer page follows the plan of the tenant (BR-81, BR-82): on trial it can be walked
 * through by the owner but books nothing; once the plan has ended it takes no one.
 */
export function BookingGate({
  tenantSlug,
  newCustomer,
}: {
  tenantSlug: string;
  newCustomer: boolean;
}) {
  const query = useSearchParams();
  const mode = entitlements(
    mockSubscription(tenantSlug, planOverrideOf(query.get('plan')), query.get('periodEnd')),
    PLAN_NOW,
  ).mode;
  const name = fixtureBySlug(tenantSlug)?.tenant.name ?? '';

  if (mode === 'expired' || mode === 'locked') {
    return (
      <div className="sp-empty mx-auto flex max-w-[560px] flex-col gap-(--space-2)">
        <h1 className="title m-0">{name} tạm ngưng nhận đặt lịch</h1>
        <p className="m-0">
          Cơ sở chưa gia hạn gói nên trang này chưa nhận khách. Bạn vẫn xem và hủy được lịch đã đặt
          bằng email xác nhận.
        </p>
      </div>
    );
  }

  const trial = mode === 'trial';
  return (
    <>
      {trial && (
        <p
          role="status"
          className="body-sm mx-auto mb-(--space-4) max-w-[560px] rounded-(--radius-md) bg-(--brand-soft) px-(--space-4) py-(--space-3) text-(--ink) min-[900px]:max-w-[1040px]"
        >
          <strong className="font-semibold">Cơ sở chưa nhận đặt lịch online.</strong> Chỉ chủ cơ sở
          đã đăng nhập xem thử được trang này; chưa đặt được lịch.
        </p>
      )}
      <BookingFlow tenantSlug={tenantSlug} newCustomer={newCustomer} bookingOpen={!trial} />
    </>
  );
}
