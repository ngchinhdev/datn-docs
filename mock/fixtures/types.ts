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
  /** Letter on the tenant's mark in the app shell; not the first letter of the full name. */
  monogram: string;
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

/** Two layers (BR-15): the customer page reads only the public fields. */
export interface StaffProfile {
  displayName: string;
  title: string;
  specialty: string;
  avatarUrl?: string;
  bookableOnline: boolean;
  /** Admin only. */
  fullName: string;
  /** Admin only. */
  employeeCode: string;
  /** Admin only. E.164. */
  phone: string;
  /** Admin only. Sign-in address. */
  email: string;
  /** Admin only. `YYYY-MM`. */
  joinedAt: string;
}

/** What a member of staff may do in the admin area. */
export type StaffRoleId = 'owner' | 'manager' | 'receptionist' | 'technician';

/** A staff member is a resource whose type has `isStaff`; skills limit which services they do (BR-03). */
export interface Staff {
  resourceId: string;
  profile: StaffProfile;
  role: StaffRoleId;
  /** 1-based index into `TenantFixture.staffLevels`; services with a price per level use it. */
  level: number;
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
  /** What happens during a wait, e.g. "chờ lên màu". */
  label?: string;
}

/** An exact value, or a number range: `min` included, `max` not (`{ max: 10 }` is "under 10"). */
export type MatchValue = string | { min?: number; max?: number };

export interface ServiceVariant {
  id: string;
  name: string;
  /** Calendar label, e.g. "Nhuộm ngắn". */
  shortName: string;
  /** Integer VND. */
  priceVnd: bigint;
  /** Integer VND paid online to confirm; absent = no deposit. */
  depositVnd?: bigint;
  /** Served-subject attributes that select this variant (BR-13). */
  match: Record<string, MatchValue>;
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
  /** How staff address them on the calendar, e.g. "Chị Hà". */
  callName: string;
  /** Visits so far, including today. */
  visitCount?: number;
  /** Internal note; never shown to the customer (BR-62). */
  note?: string;
}

export interface ServedSubject {
  id: string;
  tenantId: string;
  customerId: string;
  /** The customer themself, or someone/something else they book for; details live in `attributes`. */
  kind: 'self' | 'other';
  name: string;
  attributes: Record<string, string>;
}

export type AppointmentStatus =
  'held' | 'confirmed' | 'checked_in' | 'completed' | 'cancelled' | 'no_show';

export interface AppointmentItem {
  serviceVariantId: string;
  servedSubjectId: string;
  staffResourceId: string;
  /** Price at booking time (BR-12). */
  priceVnd: bigint;
}

/** One occupied interval of one resource, half-open `[startAt, endAt)`, ISO 8601 UTC. */
export interface ResourceBooking {
  resourceId: string;
  startAt: string;
  endAt: string;
  kind: 'work' | 'wait';
  /** Index into `Appointment.items`. */
  itemIndex: number;
  label?: string;
}

export interface Appointment {
  id: string;
  tenantId: string;
  branchId: string;
  /** `null` while an online hold has no contact details yet. */
  customerId: string | null;
  /** ISO 8601, UTC. */
  startAt: string;
  status: AppointmentStatus;
  channel: 'online' | 'walk_in' | 'phone';
  items: AppointmentItem[];
  bookings: ResourceBooking[];
  /** Status `held` only (BR-07). ISO 8601, UTC. */
  holdExpiresAt?: string;
  /** ISO 8601, UTC. */
  checkedInAt?: string;
  /** Integer VND. */
  depositVnd?: bigint;
  /** Paid in full; a completed appointment without it waits for payment. */
  settled?: boolean;
  note?: string;
}

/** A staff member off for a whole local day; no appointment can use them that day. */
export interface StaffTimeOff {
  resourceId: string;
  /** Local date `YYYY-MM-DD`. */
  date: string;
  note: string;
}

/** One field a customer fills in for the person or thing being served (BR-71). */
export type SubjectField =
  | {
      key: string;
      label: string;
      type: 'enum';
      options: { value: string; label: string }[];
      required: boolean;
    }
  | {
      key: string;
      label: string;
      type: 'number';
      unit?: string;
      /** Placeholder, e.g. "6". */
      example?: string;
      /** `true`, `false`, or the values of other fields that make it required. */
      required: boolean | Record<string, string>;
    }
  | { key: string; label: string; type: 'text'; example?: string; required: boolean };

/**
 * What differs between industries, as data: the words shown to people and the fields of the
 * served subject. Copied into a tenant when it is created (BR-70).
 */
export interface IndustryTemplate {
  id: string;
  name: string;
  vocabulary: {
    /** Plural-free noun for staff in this industry. */
    staff: string;
    /** The thing served when it is not the customer themself; `null` when it is. */
    subject: string | null;
    /** Booking step title asking which subject. */
    subjectQuestion: string | null;
    /** Button that adds one. */
    addSubject: string | null;
    /** Placeholder for the subject's name: "Mochi". */
    subjectExample: string | null;
  };
  /** Empty when the customer is the only subject. */
  subjectSchema: SubjectField[];
  /** Resources other than staff that a new tenant starts with. */
  resourceTypes: TemplateResourceType[];
  /** Services created with the tenant; the sign-up preview lists them. */
  sampleServices: SampleService[];
  /** Who the customer books for, in the sign-up preview: "chính mình", "thú cưng". */
  bookingFor: string;
  /** One sentence under the preview about what is special in this industry. */
  previewNote: string;
}

export interface TemplateResourceType {
  name: string;
  /** One line under the name when the owner sets the count. */
  hint: string;
  /** Count suggested for the first branch. */
  defaultCount: number;
}

export interface SampleServiceVariant {
  name: string;
  minutes: number;
  /** Integer VND. */
  priceVnd: bigint;
  /** Has a wait segment: the staff is free, the other resources stay busy (BR-05). */
  hasWait?: boolean;
}

export interface SampleService {
  name: string;
  variants: SampleServiceVariant[];
  /** Price depends on the served subject: the preview shows one line "từ <lowest price>". */
  priceBySubject?: boolean;
}

export interface TenantFixture {
  tenant: Tenant;
  template: IndustryTemplate;
  branches: Branch[];
  resourceTypes: ResourceType[];
  resources: Resource[];
  staff: Staff[];
  /** Public titles a profile can carry, e.g. "Thợ chính". */
  staffTitles: string[];
  /** Pay levels, lowest first, e.g. "Thợ", "Thợ chính", "Thợ cả". */
  staffLevels: string[];
  staffTimeOff: StaffTimeOff[];
  services: Service[];
  customers: Customer[];
  servedSubjects: ServedSubject[];
  appointments: Appointment[];
}
