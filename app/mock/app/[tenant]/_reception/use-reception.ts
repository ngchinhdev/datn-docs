'use client';

import { useCallback } from 'react';
import { useScheduleStore } from '@/components/mock/schedule-store';
import { useToast } from '@/components/sapio/toast';

/** The tenant's appointments and a toast; changes live in page state, nothing is saved. */
export function useReception() {
  const { appointments, replaceAppointment: replace } = useScheduleStore();
  const show = useToast();
  const notify = useCallback((text: string) => show({ text }), [show]);
  return { appointments, replace, notify, show };
}
