// View models for the service settings. Pure functions over fixtures; no React.
import type { Appointment, Service, ServiceVariant, Staff, TenantFixture } from './fixtures';
import { formatDuration, formatVnd } from './format';
import { ANY_STAFF, priceFor, priceRange, visibleMinutes, type PricedStaff } from './occupation';
import { MOCK_NOW } from './time';

/** Staff who can do the service (BR-03), with the level their price follows (BR-56). */
export const capableStaff = (service: Pick<Service, 'id'>, staff: readonly Staff[]): Staff[] =>
  staff.filter((s) => s.skillServiceIds.includes(service.id));

export const pricedStaff = (staff: readonly Staff[]): PricedStaff[] =>
  staff.map((s) => ({ resourceId: s.resourceId, level: s.level }));

/** `1 giờ 45` for one variant, `1 giờ–1 giờ 30` for a service whose variants differ. */
export function durationText(variants: readonly Pick<ServiceVariant, 'segments'>[]): string {
  const minutes = variants.map(visibleMinutes);
  const low = Math.min(...minutes);
  const high = Math.max(...minutes);
  return low === high ? formatDuration(low) : `${formatDuration(low)}–${formatDuration(high)}`;
}

/** `500.000–550.000 ₫`: what the people who can do it charge; one number when they agree. */
export function priceText(variant: ServiceVariant, capable: readonly Staff[]): string {
  const [low, high] = priceRange(variant, pricedStaff(capable));
  if (low === high) return formatVnd(low);
  return `${formatVnd(low).replace(' ₫', '')}–${formatVnd(high)}`;
}

/** What a customer pays when they leave the choice to the system (BR-56). */
export const anyPrice = (variant: ServiceVariant, capable: readonly Staff[]) =>
  priceFor(variant, ANY_STAFF, pricedStaff(capable));

/** The lowest price over every variant, for the "từ …" column. */
export function fromPrice(service: Service, capable: readonly Staff[]): bigint {
  return service.variants
    .map((v) => anyPrice(v, capable))
    .reduce((low, p) => (p < low ? p : low), service.variants[0]?.priceVnd ?? 0n);
}

/** Appointments still to come that use the variant; they keep its time and price (BR-12, BR-59). */
export function upcomingCount(
  appointments: readonly Appointment[],
  variantIds: ReadonlySet<string>,
): number {
  return appointments.filter(
    (a) =>
      a.status === 'confirmed' &&
      a.startAt > MOCK_NOW &&
      a.items.some((i) => variantIds.has(i.serviceVariantId)),
  ).length;
}

export const serviceById = (fixture: TenantFixture, id: string) =>
  fixture.services.find((s) => s.id === id);
