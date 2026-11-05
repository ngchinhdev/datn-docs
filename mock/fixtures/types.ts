// Mock data shapes. Names follow the glossary (content/docs/nghiep-vu/thuat-ngu.md).

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday

/** Local wall-clock time in the branch time zone, `HH:mm`. */
export type LocalTime = `${number}:${number}`;

export interface BusinessHours {
  weekday: Weekday;
  open: LocalTime;
  close: LocalTime;
}

/** Overrides the regular hours for one date (BR-02). `null` hours = closed all day. */
export interface SpecialDay {
  date: string; // YYYY-MM-DD, local date
  note: string;
  hours: { open: LocalTime; close: LocalTime } | null;
}

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  industry: string;
}

export interface Branch {
  id: string;
  tenantId: string;
  name: string;
  address: string;
  timeZone: string;
  businessHours: BusinessHours[];
  specialDays: SpecialDay[];
}

export interface ResourceType {
  id: string;
  tenantId: string;
  name: string;
  isStaff: boolean;
}

export interface Resource {
  id: string;
  tenantId: string;
  branchId: string;
  resourceTypeId: string;
  name: string;
}

/** A staff member is a resource whose type has `isStaff`; skills limit which services they do (BR-03). */
export interface Staff {
  resourceId: string;
  phone: string;
  skillServiceIds: string[];
}

/**
 * Minutes from the start of the service, half-open `[startMinute, endMinute)`.
 * A `wait` segment frees the staff but keeps the other resources (BR-05).
 */
export interface ServiceSegment {
  startMinute: number;
  endMinute: number;
  kind: 'work' | 'wait';
  resourceTypeIds: string[];
}

export interface ServiceVariant {
  id: string;
  name: string;
  /** Integer VND. */
  priceVnd: bigint;
  /** Served-subject attributes that select this variant (BR-13). */
  match: Record<string, string>;
  segments: ServiceSegment[];
}

export interface Service {
  id: string;
  tenantId: string;
  name: string;
  variants: ServiceVariant[];
}

export interface Customer {
  id: string;
  tenantId: string;
  name: string;
  /** E.164, normalized (BR-61). */
  phone: string;
}

export interface ServedSubject {
  id: string;
  tenantId: string;
  customerId: string;
  kind: 'self' | 'pet';
  name: string;
  attributes: Record<string, string>;
}

export type AppointmentStatus = 'confirmed' | 'checked_in' | 'completed' | 'cancelled' | 'no_show';

export interface AppointmentItem {
  serviceVariantId: string;
  servedSubjectId: string;
  staffResourceId: string;
  /** Price at booking time (BR-12). */
  priceVnd: bigint;
}

export interface Appointment {
  id: string;
  tenantId: string;
  branchId: string;
  customerId: string;
  /** ISO 8601, UTC. */
  startAt: string;
  status: AppointmentStatus;
  items: AppointmentItem[];
}

export interface TenantFixture {
  tenant: Tenant;
  branches: Branch[];
  resourceTypes: ResourceType[];
  resources: Resource[];
  staff: Staff[];
  services: Service[];
  customers: Customer[];
  servedSubjects: ServedSubject[];
  appointments: Appointment[];
}
