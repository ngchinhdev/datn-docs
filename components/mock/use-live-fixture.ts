'use client';

import { useMemo } from 'react';
import { useScheduleStore } from '@/components/mock/schedule-store';
import { useServiceStore } from '@/components/mock/service-store';
import { useStaffStore } from '@/components/mock/staff-store';
import { tenantFixtures, type TenantFixture } from '@/mock/fixtures';
import { applyBranchPrices } from '@/mock/shop';

/**
 * The tenant's fixture with what the session changed: staff skills, services, appointments,
 * customers and pets, and what Cài đặt keeps: the first branch with its hours and prices, resource
 * types, resources, policies, packages, bonus tiers and the rest. Screens that look things up or
 * ask for free times read this one; the other branches of Cài đặt are in the store.
 */
export function useLiveFixture(tenantSlug: string): TenantFixture {
  const base = tenantFixtures.find((f) => f.tenant.slug === tenantSlug) ?? tenantFixtures[0]!;
  const { staff } = useStaffStore();
  const { services } = useServiceStore();
  const store = useScheduleStore();
  const {
    appointments,
    customers,
    shifts,
    leaves,
    staffSeesCustomerPhone,
    policies,
    branch,
    resourceTypes,
    resources,
    packageCatalog,
    topupBonusTiers,
    config,
  } = store;
  return useMemo(
    () => ({
      ...base,
      staff,
      // BR-02: the branch may price a variant on its own.
      services: applyBranchPrices(services, branch.prices),
      appointments,
      customers,
      shifts,
      staffTimeOff: leaves,
      staffSeesCustomerPhone,
      policies,
      // Calendar, shifts and services of the mock know the first branch only; the branches added
      // in Cài đặt live in the store and show on Chi nhánh and Tài nguyên.
      branches: [branch],
      resourceTypes,
      resources: resources.filter((r) => r.branchId === branch.id),
      packageCatalog,
      topupBonusTiers,
      config,
    }),
    [
      base,
      staff,
      services,
      appointments,
      customers,
      shifts,
      leaves,
      staffSeesCustomerPhone,
      policies,
      branch,
      resourceTypes,
      resources,
      packageCatalog,
      topupBonusTiers,
      config,
    ],
  );
}
