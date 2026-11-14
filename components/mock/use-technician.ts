'use client';

import { useSearchParams } from 'next/navigation';
import { useAccountStore, workspaceBySlug } from '@/components/mock/account-store';
import { useStaffStore } from '@/components/mock/staff-store';
import { memberForRole } from '@/mock/account';
import type { Staff } from '@/mock/fixtures';
import { staffRoleOf } from '@/mock/selection';

/**
 * The technician the mock is showing the app of: `?me=` names a person, otherwise the first of
 * the staff (Mai at Tóc Mây).
 */
export function useTechnician(): Staff {
  const { staff } = useStaffStore();
  const me = useSearchParams().get('me');
  return staff.find((s) => s.resourceId === me) ?? staff[0]!;
}

/**
 * The person whose own pages the mock is showing: the technician, or a manager who has a column
 * on the calendar. `null` for a role without a column, who has no commission of their own (BR-44).
 */
export function useOwnStaff(tenantSlug: string): Staff | null {
  const { staff } = useStaffStore();
  const { members } = useAccountStore();
  const technician = useTechnician();
  const role = staffRoleOf(useSearchParams().get('role'));
  if (role === 'technician') return technician;
  const member = memberForRole(members, workspaceBySlug(tenantSlug)?.id ?? '', role);
  return staff.find((s) => s.resourceId === member?.staffResourceId) ?? null;
}
