'use client';

import { useSubscription } from '@/components/mock/subscription-store';
import { ReceptionScreen } from './reception-screen';
import { TrialCalendar } from './trial-calendar';

/** On trial the calendar is replaced by what to prepare (BR-81); otherwise the reception calendar. */
export function CalendarGate({ tenantSlug }: { tenantSlug: string }) {
  const { entitlements } = useSubscription();
  return entitlements.mode === 'trial' ? (
    <TrialCalendar tenantSlug={tenantSlug} />
  ) : (
    <ReceptionScreen tenantSlug={tenantSlug} />
  );
}
