import {
  ANY_STAFF,
  matchesAttributes,
  occupation,
  prepMinutes,
  priceFor,
  resourceTypesOf,
  visibleMinutes,
} from '../occupation.ts';
import type {
  Appointment,
  AppointmentItem,
  AppointmentStatus,
  Resource,
  ResourceBooking,
  Service,
  ServiceVariant,
  Staff,
  StaffChoice,
} from './types.ts';

export { matchesAttributes };

export function findVariant(services: Service[], variantId: string): ServiceVariant {
  for (const service of services) {
    const variant = service.variants.find((v) => v.id === variantId);
    if (variant) return variant;
  }
  throw new Error(`Unknown service variant ${variantId}`);
}

const addMinutes = (iso: string, minutes: number) =>
  new Date(Date.parse(iso) + minutes * 60_000).toISOString().replace('.000Z', 'Z');

const lowerFirst = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);

/**
 * Expands a variant into resource bookings for a customer arriving at `startAt` (UTC): the
 * segments, with `prep` before that time (BR-51), and the cleanup of each resource type after its
 * last segment (BR-52). `assign` maps each resource type of the variant to the concrete resource.
 */
export function bookVariant(
  startAt: string,
  variant: ServiceVariant,
  assign: Record<string, string>,
  itemIndex = 0,
): ResourceBooking[] {
  const origin = addMinutes(startAt, -prepMinutes(variant));
  const resourceFor = (typeId: string) => {
    const resourceId = assign[typeId];
    if (!resourceId) throw new Error(`${variant.id}: no resource for type ${typeId}`);
    return resourceId;
  };
  const segments = variant.segments.flatMap((segment) =>
    segment.resourceTypeIds.map((typeId): ResourceBooking => ({
      resourceId: resourceFor(typeId),
      startAt: addMinutes(origin, segment.startMinute),
      endAt: addMinutes(origin, segment.endMinute),
      kind: segment.kind,
      itemIndex,
      label: lowerFirst(segment.name),
    })),
  );
  const cleanups = resourceTypesOf(variant).flatMap((typeId): ResourceBooking[] => {
    const minutes = variant.cleanupMinutes[typeId] ?? 0;
    if (minutes <= 0) return [];
    const [last] = occupation(variant, typeId).slice(-1);
    if (!last) return [];
    return [
      {
        resourceId: resourceFor(typeId),
        startAt: addMinutes(origin, last[1] - minutes),
        endAt: addMinutes(origin, last[1]),
        kind: 'cleanup',
        itemIndex,
        label: 'dọn',
      },
    ];
  });
  return [...segments, ...cleanups];
}

/** When the customer is done with the item: the end of its last `work` segment (BR-51). */
export const variantEnd = (startAt: string, variant: ServiceVariant) =>
  addMinutes(startAt, visibleMinutes(variant));

export interface ItemSpec {
  variantId: string;
  /** `null` for a hold that has no contact yet. */
  subjectId: string | null;
  /** One resource per resource type of the variant, staff first. */
  resourceIds: string[];
  /** Default `any`: the system picked the person (BR-31). */
  staffChoice?: StaffChoice;
  /** Starts here instead of after the previous item (two pets served side by side). */
  startAt?: string;
}

/**
 * Builds appointments whose items run back to back, with bookings expanded from the segments.
 * An item that needs preparation starts one preparation later than the item before it, so the
 * person who prepares is not busy twice.
 */
export function appointmentBuilder(ctx: {
  tenantId: string;
  branchId: string;
  services: Service[];
  resources: Resource[];
  staff: Staff[];
}) {
  const typeOf = new Map(ctx.resources.map((r) => [r.id, r.resourceTypeId]));
  const serviceOf = (variantId: string) =>
    ctx.services.find((s) => s.variants.some((v) => v.id === variantId));
  /** The people who can do the service, with the level their price follows (BR-56). */
  const levelsFor = (variantId: string) =>
    ctx.staff
      .filter((s) => s.skillServiceIds.includes(serviceOf(variantId)?.id ?? ''))
      .map((s) => ({ resourceId: s.resourceId, level: s.level }));
  return (
    id: string,
    customerId: string | null,
    startAt: string,
    status: AppointmentStatus,
    items: ItemSpec[],
    extra: Partial<Appointment> = {},
  ): Appointment => {
    let cursor = startAt;
    const bookings: ResourceBooking[] = [];
    const appointmentItems: AppointmentItem[] = items.map((item, itemIndex) => {
      const variant = findVariant(ctx.services, item.variantId);
      if (item.startAt) cursor = item.startAt;
      else if (itemIndex > 0) cursor = addMinutes(cursor, prepMinutes(variant));
      const assign = Object.fromEntries(item.resourceIds.map((r) => [typeOf.get(r) ?? '', r]));
      bookings.push(...bookVariant(cursor, variant, assign, itemIndex));
      cursor = variantEnd(cursor, variant);
      const staffResourceId = item.resourceIds[0] ?? '';
      const staffChoice = item.staffChoice ?? 'any';
      return {
        serviceVariantId: variant.id,
        servedSubjectId: item.subjectId ?? '',
        staffResourceId,
        staffChoice,
        // BR-56: a named person charges their level; "Bất kỳ ai" charges the lowest.
        priceVnd: priceFor(
          variant,
          staffChoice === 'chosen' ? staffResourceId : ANY_STAFF,
          levelsFor(variant.id),
        ),
      };
    });
    return {
      id,
      tenantId: ctx.tenantId,
      branchId: ctx.branchId,
      customerId,
      startAt,
      status,
      channel: 'online',
      items: appointmentItems,
      bookings,
      ...extra,
    };
  };
}
