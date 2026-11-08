'use client';

import { useMemo } from 'react';
import { useScheduleStore } from '@/components/mock/schedule-store';
import { useServiceStore } from '@/components/mock/service-store';
import { useStaffStore } from '@/components/mock/staff-store';
import { tenantFixtures, type TenantFixture } from '@/mock/fixtures';

/**
 * The tenant's fixture with what the session changed: staff skills, services, appointments,
 * customers and pets. Screens that look things up or ask for free times read this one.
 */
export function useLiveFixture(tenantSlug: string): TenantFixture {
  const base = tenantFixtures.find((f) => f.tenant.slug === tenantSlug) ?? tenantFixtures[0]!;
  const { staff } = useStaffStore();
  const { services } = useServiceStore();
  const { appointments, customers, servedSubjects, staffSeesCustomerPhone } = useScheduleStore();
  return useMemo(
    () => ({
      ...base,
      staff,
      services,
      appointments,
      customers,
      servedSubjects,
      staffSeesCustomerPhone,
    }),
    [base, staff, services, appointments, customers, servedSubjects, staffSeesCustomerPhone],
  );
}
