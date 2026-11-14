'use client';

import { useSearchParams } from 'next/navigation';
import { useCallback, useMemo, useRef } from 'react';
import { MOCK_NOW } from '@/mock/time';
import type { Ctx, World } from '@/mock/money-ops';
import { roleLabel, staffRoleOf, type StaffRole } from '@/mock/selection';
import { useScheduleStore } from './schedule-store';
import { useLiveFixture } from './use-live-fixture';

/**
 * What the money screens need: the tenant, the role looking, the money data together with the
 * customers and appointments it touches, and the context the pure functions of `mock/money-ops`
 * take. The clock starts at the mock time when the screen opens and is read when an action runs.
 */
export function useDesk(tenantSlug: string) {
  const fixture = useLiveFixture(tenantSlug);
  const store = useScheduleStore();
  const role: StaffRole = staffRoleOf(useSearchParams().get('role'));
  const openedAt = useRef<number | null>(null);
  const now = useCallback(() => {
    openedAt.current ??= performance.now();
    return new Date(Date.parse(MOCK_NOW) + (performance.now() - openedAt.current)).toISOString();
  }, []);

  const world: World = useMemo(
    () => ({ money: store.money, customers: store.customers, appointments: store.appointments }),
    [store.money, store.customers, store.appointments],
  );
  /** Receptionists collect and ask for refunds; managers and owners decide (BR-22, BR-28). */
  const canManage = role === 'manager' || role === 'owner';
  const actor = role === 'technician' ? 'Kỹ thuật viên' : fixture.actors[role];
  const ctx = useCallback(
    (): Ctx => ({
      services: fixture.services,
      catalog: fixture.packageCatalog,
      commissionPercent: fixture.commissionPercent,
      now: now(),
      actor,
      role: roleLabel(role),
    }),
    [fixture, actor, role, now],
  );

  /** The gateway reported a payment: a line in its history (Cài đặt › Thanh toán). */
  const logGateway = useCallback(
    (text: string) => {
      const gateway = store.config.gateway;
      store.saveSettings({
        config: {
          gateway: {
            ...gateway,
            events: [
              ...gateway.events,
              { id: `gw-${gateway.events.length + 1}`, at: now(), text, ok: true },
            ],
          },
        },
      });
    },
    [store, now],
  );

  return {
    logGateway,
    fixture,
    role,
    canManage,
    actor,
    world,
    ctx,
    now,
    apply: store.applyWorld,
    customers: store.customers,
    appointments: store.appointments,
  };
}
