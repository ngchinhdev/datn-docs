import type {
  Appointment,
  AppointmentItem,
  AppointmentStatus,
  Resource,
  ResourceBooking,
  Service,
  ServiceVariant,
} from './types';

export function findVariant(services: Service[], variantId: string): ServiceVariant {
  for (const service of services) {
    const variant = service.variants.find((v) => v.id === variantId);
    if (variant) return variant;
  }
  throw new Error(`Unknown service variant ${variantId}`);
}

const addMinutes = (iso: string, minutes: number) =>
  new Date(Date.parse(iso) + minutes * 60_000).toISOString().replace('.000Z', 'Z');

/**
 * Expands a variant's segments into resource bookings starting at `startAt` (UTC).
 * `assign` maps each resource type of the variant to the concrete resource.
 */
export function bookVariant(
  startAt: string,
  variant: ServiceVariant,
  assign: Record<string, string>,
): ResourceBooking[] {
  return variant.segments.flatMap((segment) =>
    segment.resourceTypeIds.map((typeId) => {
      const resourceId = assign[typeId];
      if (!resourceId) throw new Error(`${variant.id}: no resource for type ${typeId}`);
      return {
        resourceId,
        startAt: addMinutes(startAt, segment.startMinute),
        endAt: addMinutes(startAt, segment.endMinute),
        kind: segment.kind,
      };
    }),
  );
}

/** End of the last segment, for chaining items of one appointment. */
export const variantEnd = (startAt: string, variant: ServiceVariant) =>
  addMinutes(startAt, Math.max(...variant.segments.map((s) => s.endMinute)));

export interface ItemSpec {
  variantId: string;
  /** `null` for a hold that has no contact yet. */
  subjectId: string | null;
  /** One resource per resource type of the variant, staff first. */
  resourceIds: string[];
  /** Starts here instead of after the previous item (two pets served side by side). */
  startAt?: string;
}

/** Builds appointments whose items run back to back, with bookings expanded from the segments. */
export function appointmentBuilder(ctx: {
  tenantId: string;
  branchId: string;
  services: Service[];
  resources: Resource[];
}) {
  const typeOf = new Map(ctx.resources.map((r) => [r.id, r.resourceTypeId]));
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
    const appointmentItems: AppointmentItem[] = items.map((item) => {
      const variant = findVariant(ctx.services, item.variantId);
      if (item.startAt) cursor = item.startAt;
      const assign = Object.fromEntries(item.resourceIds.map((r) => [typeOf.get(r) ?? '', r]));
      bookings.push(...bookVariant(cursor, variant, assign));
      cursor = variantEnd(cursor, variant);
      return {
        serviceVariantId: variant.id,
        servedSubjectId: item.subjectId ?? '',
        staffResourceId: item.resourceIds[0] ?? '',
        priceVnd: variant.priceVnd,
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
