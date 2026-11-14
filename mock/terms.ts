/*
 * The terms of a booking (BR-38): a change of Cài đặt › Chính sách applies to the bookings made
 * after it. An online booking carries the terms it was made under; one without them (the sample
 * ones) has the terms the shop opened with. Pure.
 */
import type { Appointment, BookingTerms } from './fixtures/types.ts';
import { tenantFixtures } from './fixtures/index.ts';
import { termsFrom } from './policy.ts';

/** The terms the sample shop opened with. */
export function openingTerms(tenantSlug: string): BookingTerms {
  const base = tenantFixtures.find((f) => f.tenant.slug === tenantSlug) ?? tenantFixtures[0]!;
  return termsFrom(base.policies, base.config.refundTiers);
}

/** What the customer of this booking was promised. */
export const termsOfAppointment = (
  appt: Pick<Appointment, 'terms'>,
  tenantSlug: string,
): BookingTerms => appt.terms ?? openingTerms(tenantSlug);
