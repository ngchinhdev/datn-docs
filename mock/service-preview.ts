// What a service variant looks like on the receptionist calendar, for the detail page's preview.
import type { CalendarColumn } from '@/components/sapio/resource-calendar';
import type { TimelineSegment, TimelineType } from '@/components/sapio/segment-timeline';
import type {
  Appointment,
  ResourceType,
  Service,
  ServiceSegment,
  ServiceVariant,
  TenantFixture,
} from './fixtures';
import { bookVariant } from './fixtures/bookings';
import { resourceTypesOf } from './occupation';
import { resourceColumns, staffColumns } from './reception';
import { localToUtc, MOCK_NOW } from './time';

/** A day that is not today, so the calendar draws no "now" line. */
export const PREVIEW_DATE = '2026-12-01';
export const PREVIEW_START = '09:00';

export interface PreviewCalendar {
  columns: CalendarColumn[];
  /** Whole hours, local `HH:mm`. */
  from: string;
  to: string;
  /** Resource names, by type id, that the example uses. */
  assigned: Record<string, string>;
}

/**
 * One appointment at 09:00 with the first person who can do the service and the first resource of
 * each other type, drawn the way the reception calendar draws it.
 */
export function previewCalendar(
  fixture: TenantFixture,
  service: Service,
  variant: ServiceVariant,
  staffIds: readonly string[],
): PreviewCalendar | null {
  const staffTypeIds = new Set(fixture.resourceTypes.filter((t) => t.isStaff).map((t) => t.id));
  const assign: Record<string, string> = {};
  for (const typeId of resourceTypesOf(variant)) {
    const candidates = fixture.resources.filter((r) => r.resourceTypeId === typeId);
    const pick = staffTypeIds.has(typeId)
      ? (candidates.find((r) => staffIds.includes(r.id)) ?? candidates[0])
      : candidates[0];
    if (!pick) return null;
    assign[typeId] = pick.id;
  }
  const staffId = Object.entries(assign).find(([typeId]) => staffTypeIds.has(typeId))?.[1];
  const member = fixture.staff.find((s) => s.resourceId === staffId);
  if (!member) return null;

  const startAt = localToUtc(PREVIEW_DATE, PREVIEW_START);
  const bookings = bookVariant(startAt, variant, assign);
  const customer = fixture.customers[0];
  const appointment: Appointment = {
    id: 'preview',
    tenantId: fixture.tenant.id,
    branchId: fixture.branches[0]?.id ?? '',
    customerId: customer?.id ?? null,
    startAt,
    status: 'confirmed',
    channel: 'online',
    items: [
      {
        serviceVariantId: variant.id,
        servedSubjectId: '',
        staffResourceId: member.resourceId,
        priceVnd: variant.priceVnd,
      },
    ],
    bookings,
  };
  const shown = new Set(Object.values(assign));
  const mini: TenantFixture = {
    ...fixture,
    services: [{ ...service, variants: [variant] }],
    staff: [member],
    resources: fixture.resources.filter((r) => shown.has(r.id)),
    staffTimeOff: [],
    appointments: [appointment],
  };
  const noop = () => {};
  const columns = [
    ...staffColumns(mini, [appointment], MOCK_NOW, null, noop, PREVIEW_DATE),
    ...resourceColumns(mini, [appointment], MOCK_NOW, null, noop),
  ];
  const minutes = bookings.flatMap((b) => [Date.parse(b.startAt), Date.parse(b.endAt)]);
  const hour = (ms: number) => new Date(ms + 7 * 3600_000).getUTCHours();
  const first = hour(Math.min(...minutes));
  const last = hour(Math.max(...minutes) - 1) + 1;
  const pad = (h: number) => `${String(h).padStart(2, '0')}:00`;
  return {
    columns,
    from: pad(first),
    to: pad(Math.max(last, first + 2)),
    assigned: Object.fromEntries(
      Object.entries(assign).map(([typeId, id]) => [
        typeId,
        fixture.resources.find((r) => r.id === id)?.name ?? '',
      ]),
    ),
  };
}

/** The rows and bars of the segment timeline for one variant. */
export function timelineOf(
  variant: { segments: ServiceSegment[] },
  resourceTypes: readonly ResourceType[],
): { segments: TimelineSegment[]; types: TimelineType[] } {
  const used = new Set(resourceTypesOf(variant));
  return {
    segments: variant.segments.map((s) => ({
      name: s.name,
      kind: s.kind,
      from: s.startMinute,
      to: s.endMinute,
      typeIds: s.resourceTypeIds,
    })),
    types: resourceTypes
      .filter((t) => used.has(t.id))
      .map((t) => ({
        id: t.id,
        label: t.name,
        ...(t.isStaff && !t.name.toLowerCase().includes('nhân viên') ? { small: 'nhân viên' } : {}),
      })),
  };
}
