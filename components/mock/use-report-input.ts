'use client';

import { useMemo } from 'react';
import { useScheduleStore } from '@/components/mock/schedule-store';
import { useLiveFixture } from '@/components/mock/use-live-fixture';
import type { ReportInput } from '@/mock/reports';
import { MOCK_NOW } from '@/mock/time';

/** What the report functions read, from the data the session has changed so far. */
export function useReportInput(tenantSlug: string): ReportInput {
  const fixture = useLiveFixture(tenantSlug);
  const { money, appointments, shifts, leaves } = useScheduleStore();
  return useMemo(
    () => ({
      fixture,
      services: fixture.services,
      money,
      appointments,
      shifts,
      timeOff: leaves,
      now: MOCK_NOW,
    }),
    [fixture, money, appointments, shifts, leaves],
  );
}
