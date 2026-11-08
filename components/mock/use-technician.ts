'use client';

import { useSearchParams } from 'next/navigation';
import { useStaffStore } from '@/components/mock/staff-store';
import type { Staff } from '@/mock/fixtures';

/**
 * The technician the mock is showing the app of: `?me=` names a person, otherwise the first of
 * the staff (Mai at Tóc Mây).
 */
export function useTechnician(): Staff {
  const { staff } = useStaffStore();
  const me = useSearchParams().get('me');
  return staff.find((s) => s.resourceId === me) ?? staff[0]!;
}
