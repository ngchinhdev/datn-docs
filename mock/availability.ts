/*
 * Mock-only free-slot finder: opening hours minus existing bookings, 15-minute steps.
 * Not the real algorithm and not fully correct (no buffers, no leave, one branch only).
 * The real one lives in datn-saas/packages/scheduling-core.
 */
import type { Appointment, ServiceVariant, TenantFixture } from './fixtures';
import { openingHours } from './hours';

export const ANY_STAFF = 'any';

const STEP_MINUTES = 15;
const BLOCKING: Appointment['status'][] = ['held', 'confirmed', 'checked_in', 'completed'];

export interface FreeSlot {
  /** ISO 8601, UTC. */
  startAt: string;
  staffResourceId: string;
}

export interface AvailabilityQuery {
  fixture: TenantFixture;
  variant: ServiceVariant;
  serviceId: string;
  /** Local date in the branch time zone, `YYYY-MM-DD`. */
  date: string;
  staffResourceId: string;
  /** Slots before this instant are dropped. ISO 8601, UTC. */
  notBefore?: string;
}

/** Fixed offset is enough for Asia/Ho_Chi_Minh, which has no DST. */
const BRANCH_UTC_OFFSET_MINUTES = 7 * 60;

const toMs = (iso: string) => Date.parse(iso);
const localToUtcMs = (date: string, time: string) =>
  Date.parse(`${date}T${time}:00Z`) - BRANCH_UTC_OFFSET_MINUTES * 60_000;

/** Free start times; with `ANY_STAFF`, each time keeps the first qualified staff who is free. */
export function freeSlots(query: AvailabilityQuery): FreeSlot[] {
  const { fixture, variant, date } = query;
  const hours = openingHours(fixture, date);
  if (!hours) return [];

  const staff = fixture.staff.filter(
    (s) =>
      s.profile.bookableOnline &&
      s.skillServiceIds.includes(query.serviceId) &&
      (query.staffResourceId === ANY_STAFF || s.resourceId === query.staffResourceId),
  );
  const busy = fixture.appointments
    .filter((a) => BLOCKING.includes(a.status))
    .flatMap((a) => a.bookings)
    .map((b) => ({ resourceId: b.resourceId, start: toMs(b.startAt), end: toMs(b.endAt) }));
  const isFree = (resourceId: string, start: number, end: number) =>
    !busy.some((b) => b.resourceId === resourceId && b.start < end && start < b.end);

  const open = localToUtcMs(date, hours.open);
  const close = localToUtcMs(date, hours.close);
  const duration = Math.max(...variant.segments.map((s) => s.endMinute));
  const notBefore = query.notBefore ? toMs(query.notBefore) : -Infinity;
  const slots: FreeSlot[] = [];

  for (let t = open; t + duration * 60_000 <= close; t += STEP_MINUTES * 60_000) {
    if (t < notBefore) continue;
    const fits = (staffId: string) =>
      variant.segments.every((segment) => {
        const start = t + segment.startMinute * 60_000;
        const end = t + segment.endMinute * 60_000;
        return segment.resourceTypeIds.every((typeId) => {
          const candidates = fixture.resources.filter((r) => r.resourceTypeId === typeId);
          if (candidates.some((r) => r.id === staffId)) return isFree(staffId, start, end);
          return candidates.some((r) => isFree(r.id, start, end));
        });
      });
    const chosen = staff.find((s) => fits(s.resourceId));
    if (chosen) {
      slots.push({ startAt: new Date(t).toISOString(), staffResourceId: chosen.resourceId });
    }
  }
  return slots;
}
