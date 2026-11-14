'use client';

import { BookingFlow } from './booking-flow';
import { MOCK_NOW } from '@/mock/time';
import { entitlements } from '@/mock/subscription';
import { useTenantSubscription } from '@/components/mock/platform-store';
import { SiteSuspended, useSiteSuspended } from '@/components/mock/site-suspended';

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
  const { subscription, catalog } = useTenantSubscription(tenantSlug);
  const mode = entitlements(subscription, MOCK_NOW, catalog).mode;
  const suspended = useSiteSuspended(tenantSlug);

  if (suspended) return <SiteSuspended tenantSlug={tenantSlug} />;

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
