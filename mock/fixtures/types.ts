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

export type SegmentKind = 'prep' | 'work' | 'wait';

/**
 * Minutes from the start of the first segment, half-open `[startMinute, endMinute)` (BR-50).
 * `prep` stands only at the start; the customer does not see it (BR-51). A `wait` segment frees
 * the staff but keeps the other resources (BR-05).
 */
export interface ServiceSegment {
  startMinute: number;
  endMinute: number;
  kind: SegmentKind;
  /** Name on the calendar, e.g. "Pha thuốc", "Chờ lên màu". */
  name: string;
  resourceTypeIds: string[];
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
  /**
   * Minutes to clean each resource type after its last segment ends (BR-52); a missing type
   * needs none.
   */
  cleanupMinutes: Record<string, number>;
  /** Price per staff level, in the order of `TenantFixture.staffLevels` (BR-56); `priceVnd` is the lowest. */
  pricesByLevel?: bigint[];
}

/** Who picks the variant: the customer, or the attributes of the served subject (BR-55). */
export type VariantSelection = 'customer' | 'subject';

export interface Service {
  id: string;
  tenantId: string;
  name: string;
  /** One of `IndustryTemplate.serviceGroups`. */
  group: string;
  /** Shown to the customer under the name. */
  description?: string;
  variantSelection: VariantSelection;
  /** Off hides the service on the customer page. */
  bookableOnline: boolean;
  variants: ServiceVariant[];
}

export interface CustomerPackage {
  id: string;
  name: string;
  totalSessions: number;
  usedSessions: number;
  remainingSessions: number;
  /** `dd/MM/yyyy`. */
  expiresAt: string;
  serviceVariantId?: string;
  note?: string;
  /** Integer VND paid for the package (BR-27). */
  priceVnd?: bigint;
  /** Retail price of one session when it was bought (BR-27). */
  unitPriceVnd?: bigint;
  /** Refunded: no session is left to use. */
  refunded?: boolean;
}

export interface WalletTransaction {
  id: string;
  date: string;
  description: string;
  amountText: string;
  isPositive?: boolean;
}

export interface CustomerWallet {
  balanceVnd: bigint;
  realVnd: bigint;
  bonusVnd: bigint;
  history: WalletTransaction[];
}

export interface Customer {
  id: string;
  tenantId: string;
  name: string;
  /** E.164, normalized (BR-61). */
  phone: string;
  email?: string;
  /** How staff address them on the calendar, e.g. "Chị Hà". */
  callName: string;
  /** Visits so far, including today. */
  visitCount?: number;
  /** Internal note; never shown to the customer (BR-62). */
  note?: string;
  packages?: CustomerPackage[];
  /** Agreed to email offers, a choice of its own; off by default (BR-64). */
  marketingOptIn?: boolean;
  /** ISO 8601, UTC: when they agreed to the processing of their data, at the first booking (BR-64). */
  consentAt?: string;
  /** A person's own decision on the deposit, over the no-show count (BR-10). */
  depositOverride?: { on: boolean; reason: string; by: string; at: string };
}

export interface ServedSubject {
  id: string;
  tenantId: string;
  customerId: string;
  /** The customer themself, or someone/something else they book for; details live in `attributes`. */
  kind: 'self' | 'other';
  name: string;
  attributes: Record<string, string>;
  /** A line for the staff written by the customer, e.g. "Sợ máy sấy to, cần dỗ." */
  note?: string;
}

export type AppointmentStatus =
  'held' | 'confirmed' | 'checked_in' | 'completed' | 'cancelled' | 'no_show';

/** Who picked the person: the customer named them, or left it to the system (BR-31). */
export type StaffChoice = 'any' | 'chosen';

export interface AppointmentItem {
  serviceVariantId: string;
  servedSubjectId: string;
  staffResourceId: string;
  /** `chosen`: changing the person needs the customer's consent (BR-32, BR-34). */
  staffChoice: StaffChoice;
  /** The person was changed by a drag and the customer has not answered yet (BR-32). */
  swapUnconfirmed?: boolean;
  /**
   * How far the technician has taken the item (BR-36): started, started the part after the wait,
   * or done. Absent until they press a button.
   */
  stage?: 'started' | 'resumed' | 'done';
  /** Price at booking time (BR-12). */
  priceVnd: bigint;
}

/** One occupied interval of one resource, half-open `[startAt, endAt)`, ISO 8601 UTC. */
export interface ResourceBooking {
  resourceId: string;
  startAt: string;
  endAt: string;
  /** `cleanup` is the time after the last segment that uses the resource (BR-52). */
  kind: SegmentKind | 'cleanup';
  /** Index into `Appointment.items`. */
  itemIndex: number;
  /** Segment name in lower case, e.g. "chờ lên màu". */
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
  /** Reference of the online deposit, e.g. `PG-7K2Q9`; the invoice shows it as a payment. */
  depositRef?: string;
  /** ISO 8601, UTC: when the deposit came in. */
  depositPaidAt?: string;
  /** Paid in full; a completed appointment without it waits for payment. */
  settled?: boolean;
  note?: string;
  /** Times the customer moved it by themselves; capped by BR-08 (answering a question of the shop does not count). */
  selfChanges?: number;
}

/** One block of a working day of one person; a day may have several (BR-35). */
export interface Shift {
  resourceId: string;
  /** Local date `YYYY-MM-DD`. */
  date: string;
  /** May be before opening time, to prepare (BR-54). */
  start: LocalTime;
  end: LocalTime;
}

export type LeaveStatus = 'pending' | 'approved' | 'rejected';

/**
 * How one affected appointment is dealt with (BR-34). Nothing changes on the calendar until the
 * leave is approved.
 */
export type LeaveHandling =
  /** "Bất kỳ ai": another person at the same time. */
  | { kind: 'swap'; staffResourceId: string }
  /** The customer chose the person: an email asks them to accept `staffResourceId` (BR-33). */
  | { kind: 'asked'; staffResourceId: string; sentAt: string }
  /** The customer accepted the other person. */
  | { kind: 'agreed'; staffResourceId: string }
  /** Another time, with a person. */
  | { kind: 'move'; staffResourceId: string; startAt: string }
  /** Cancelled and the customer told; the deposit is refunded in full (BR-24). */
  | { kind: 'cancel' }
  /** The customer answered the question by choosing another time; the booking is already there. */
  | { kind: 'rescheduled'; staffResourceId: string; startAt: string }
  /** The customer cancelled the booking by themselves while the question was open. */
  | { kind: 'customer_cancelled' };

/** A request to be off, whole days or a few hours of one day. */
export interface StaffTimeOff {
  id: string;
  resourceId: string;
  /** Local date `YYYY-MM-DD`. */
  date: string;
  /** Local times of a few hours off; both absent = the whole day. */
  from?: LocalTime;
  to?: LocalTime;
  /** The reason the person gave. */
  reason: string;
  status: LeaveStatus;
  /** ISO 8601, UTC. */
  sentAt: string;
  /** Appointments it touched when decided; a pending request counts them from the calendar. */
  affectedCount?: number;
  /** Pending only: how each affected appointment will be dealt with, by appointment id. */
  handling?: Record<string, LeaveHandling>;
  /** Rejected only: shown to the person. */
  rejectReason?: string;
}

/**
 * Appointments left without their person after a shift was cut short (BR-35): dealt with like the
 * ones a leave request touches, then the entry goes.
 */
export interface Requeue {
  id: string;
  resourceId: string;
  /** Local date `YYYY-MM-DD` of the shortened shift. */
  date: string;
  /** What changed, e.g. "Còn làm 10:00–15:00". */
  reason: string;
  /** ISO 8601, UTC. */
  createdAt: string;
  appointmentIds: string[];
  handling: Record<string, LeaveHandling>;
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
/** `open`: a tenant can pick it at sign-up; `soon`: the card shows but cannot be picked; `hidden`: no card. */
export type TemplateStatus = 'open' | 'soon' | 'hidden';

/** Starting values of a new tenant's booking policies (BR-06, BR-08, BR-09, BR-10). */
export interface TemplatePolicies {
  /** Earliest booking, hours from now. */
  minNoticeHours: number;
  /** Latest booking, days from now. */
  maxAdvanceDays: number;
  /** A customer changes or cancels at least this many hours before. */
  cancelBeforeHours: number;
  /** Times a customer may reschedule one appointment. */
  maxReschedules: number;
  /** Minutes after the start time at which a missed appointment is a no-show. */
  noShowAfterMinutes: number;
  /** No-shows in 6 months after which a deposit is required. */
  depositAfterNoShows: number;
}

/** The part of a template an administrator edits; a draft remembers it as it was when it began. */
export interface TemplateContent {
  name: string;
  status: TemplateStatus;
  cardDescription: string;
  previewNote: string;
  vocabulary: IndustryTemplate['vocabulary'];
  defaultPolicies: TemplatePolicies;
  sampleServices: SampleService[];
}

/** An industry template (BR-70): published versions are copied into a tenant when it is created. */
export interface IndustryTemplate {
  /** The code, e.g. `hair_salon`. */
  id: string;
  name: string;
  status: TemplateStatus;
  /** Text on the industry card at sign-up. */
  cardDescription: string;
  /** The version new tenants receive; `null` before the first publication. */
  publishedVersion: { number: number; publishedAt: string; tenantsCreated: number } | null;
  /** Changes waiting to be published; `base` is the content they started from. */
  draft: { number: number; changes: string[]; base: Partial<TemplateContent> } | null;
  defaultPolicies: TemplatePolicies;
  /** Local date of the last edit, `YYYY-MM-DD`. */
  updatedAt: string;
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
  /** Groups a service can belong to. */
  serviceGroups: string[];
  /** Services created with the tenant; the sign-up preview lists them. */
  sampleServices: SampleService[];
  /** Who the customer books for, in the sign-up preview: "chính mình", "thú cưng". */
  bookingFor: string;
  /** One sentence under the preview about what is special in this industry. */
  previewNote: string;
}

export interface TemplateResourceType {
  name: string;
  /** The staff type: made with the owner's account, not counted at sign-up. */
  isStaff: boolean;
  /** One line under the name when the owner sets the count. */
  hint: string;
  /** Count suggested for the first branch. */
  defaultCount: number;
}

/** One segment of a sample service; `types` are names from `IndustryTemplate.resourceTypes`. */
export interface SampleSegment {
  name: string;
  kind: SegmentKind;
  minutes: number;
  types: string[];
}

export interface SampleServiceVariant {
  name: string;
  /** Integer VND. */
  priceVnd: bigint;
  /** In order; a `wait` segment frees the staff and keeps the other resources (BR-05). */
  segments: SampleSegment[];
  /** Minutes to clean each resource type after use, by type name (BR-52). */
  cleanup?: Record<string, number>;
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
  /** Working blocks. A date with no block for anybody means everyone works the opening hours. */
  shifts: Shift[];
  staffTimeOff: StaffTimeOff[];
  /** Whether technicians see the customer's phone number (BR-36); off by default. */
  staffSeesCustomerPhone: boolean;
  services: Service[];
  customers: Customer[];
  servedSubjects: ServedSubject[];
  appointments: Appointment[];
  /** The tenant's booking policies, copied from the template when it was created (BR-70). */
  policies: TemplatePolicies;
  /** Packages on sale (BR-26). */
  packageCatalog: PackageProduct[];
  /** Top-up bonus tiers of the payment settings (BR-25), highest `minVnd` last. */
  topupBonusTiers: BonusTier[];
  /** Percent of the one commission rule that covers every line (BR-40). */
  commissionPercent: number;
  /** Who does what at the desk, as the screens write it: "Lan thu", "Hùng duyệt". */
  actors: Record<'receptionist' | 'manager' | 'owner', string>;
  /** Invoices, payments, wallet entries, refunds, commission. */
  money: MoneyState;
}

/** A package a shop sells (BR-26, BR-27); set up in Cài đặt › Gói liệu trình. */
export interface PackageProduct {
  id: string;
  name: string;
  serviceVariantId: string;
  totalSessions: number;
  validDays: number;
  /** Integer VND. */
  priceVnd: bigint;
}

/** Top up at least `minVnd` and the wallet gets `percent` of it on top (BR-25). */
export interface BonusTier {
  minVnd: bigint;
  percent: number;
}

export type PaymentMethod = 'cash' | 'transfer' | 'card' | 'wallet' | 'gateway';

export interface InvoiceLine {
  id: string;
  kind: 'service' | 'retail' | 'package_sale' | 'wallet_topup';
  description: string;
  /** Grey text under the description. */
  detail?: string;
  quantity: number;
  /** Integer VND. */
  unitPriceVnd: bigint;
  staffResourceId?: string;
  /** Service line: the variant booked (BR-12). */
  serviceVariantId?: string;
  /** Takes one session of this customer package; the line is worth 0 (BR-22). */
  packageId?: string;
  /** `package_sale`: the product sold. */
  productId?: string;
  /** `wallet_topup`: the bonus that comes with it (BR-25). */
  bonusVnd?: bigint;
}

/** Only by hand: a percentage or an amount, with a reason and who allowed it (BR-22). */
export type Discount =
  | { kind: 'percent'; percent: number; reason: string; approvedBy: string }
  | { kind: 'amount'; amountVnd: bigint; reason: string; approvedBy: string };

export interface Invoice {
  id: string;
  /** `HĐ-0187`. */
  number: string;
  appointmentId?: string;
  customerId: string | null;
  /** Shown when there is no customer record. */
  customerName?: string;
  /** ISO 8601, UTC. */
  createdAt: string;
  lines: InvoiceLine[];
  discount?: Discount;
  /** Deposit paid online, taken off the amount due (BR-22). Integer VND. */
  depositVnd: bigint;
  /** ISO 8601, UTC. Set when the last payment came in; the invoice is locked from then (BR-21). */
  paidAt?: string;
  /** Who collected, e.g. "Lan". */
  collectedBy?: string;
  /** While a transfer waits for the bank: the other payments, recorded together with it when it arrives (BR-21). */
  held?: PlannedPayment[];
}

/** A payment chosen at the desk and not yet recorded. */
export interface PlannedPayment {
  method: PaymentMethod;
  /** Integer VND counted towards the invoice. */
  amountVnd: bigint;
  /** Cash only: what the customer hands over. */
  tenderedVnd?: bigint;
}

export interface Payment {
  id: string;
  invoiceId: string;
  purpose: 'deposit' | 'invoice';
  method: PaymentMethod;
  /** Integer VND counted towards the invoice. */
  amountVnd: bigint;
  /** Cash only: what the customer handed over. */
  tenderedVnd?: bigint;
  /** Wallet only: the part paid from real money and from the bonus (BR-25). */
  realVnd?: bigint;
  bonusVnd?: bigint;
  /** Reference of the payment, e.g. `CS-0187`. */
  code: string;
  /** ISO 8601, UTC. */
  at: string;
  /** A transfer waits for the bank; the other methods are paid at once. */
  status: 'pending' | 'paid';
  /** One payment is recorded once per key (BR-21). */
  idempotencyKey: string;
}

/** One line of the wallet ledger: real money and bonus move apart, the balance is their sum (BR-20, BR-25). */
export interface WalletEntry {
  id: string;
  customerId: string;
  /** ISO 8601, UTC. */
  at: string;
  /** Signed integer VND. */
  realVnd: bigint;
  /** Signed integer VND. */
  bonusVnd: bigint;
  kind: 'topup' | 'payment' | 'refund' | 'withdraw' | 'deposit_excess';
  memo: string;
  invoiceId?: string;
  idempotencyKey: string;
}

export type RefundStatus = 'pending' | 'approved' | 'rejected' | 'auto';

/** A request to give money back from one payment (BR-28), or the automatic one of BR-29. */
export interface RefundRequest {
  id: string;
  invoiceId: string | null;
  paymentId: string | null;
  customerId: string | null;
  /** First line of the "Khách, hóa đơn" cell. */
  who: string;
  /** Second line: the invoice number and what it was for. */
  what: string;
  /** Integer VND. */
  amountVnd: bigint;
  /** Where the money goes back: the method of the payment. */
  method: PaymentMethod;
  reason: string;
  /** "Lan", or "Tự động" for BR-29. */
  createdBy: string;
  /** ISO 8601, UTC. */
  createdAt: string;
  status: RefundStatus;
  decidedBy?: string;
  decidedAt?: string;
  /** Rejected only. */
  rejectNote?: string;
  /** Invoice line the refund is about. */
  lineId?: string;
  /** Refund of a package sale (BR-27): the package and the fee that was taken off. */
  packageId?: string;
  feeVnd?: bigint;
  /** The line used a package session: it goes back to the package (BR-28). */
  returnSession?: boolean;
  /** Set when approved: how a wallet payment goes back. */
  walletRealVnd?: bigint;
  walletBonusVnd?: bigint;
}

export interface CommissionPeriod {
  id: string;
  /** `11/2026`. */
  label: string;
  status: 'open' | 'closed';
}

/** A commission posting of one person; the clawback of a refund is negative (BR-28, BR-42). */
export interface CommissionEntry {
  id: string;
  staffResourceId: string;
  periodId: string;
  /** Signed integer VND. */
  amountVnd: bigint;
  invoiceId: string;
  kind: 'earn' | 'clawback';
  /** ISO 8601, UTC. */
  at: string;
}

/** A sensitive action and who did it (BR-63). */
export interface AuditEntry {
  id: string;
  /** ISO 8601, UTC. */
  at: string;
  by: string;
  text: string;
}

export interface MoneyState {
  invoices: Invoice[];
  payments: Payment[];
  walletEntries: WalletEntry[];
  refunds: RefundRequest[];
  commission: CommissionEntry[];
  periods: CommissionPeriod[];
  audit: AuditEntry[];
}
