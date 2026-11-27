import { AUTH_COPY, type AuthLang } from './auth-copy';
import { fold } from './customers';
import { accounts } from './fixtures/accounts';
import { COMMON_PASSWORDS } from './fixtures/common-passwords';
import type { SampleServiceVariant } from './fixtures/types';
import { tenantFixtures } from './fixtures';

export const STEPS = ['account', 'verify', 'business', 'done'] as const;
export type SignupStep = (typeof STEPS)[number];

/** `?step=industry` is a step that no longer exists; it lands on `business`. */
export const stepOf = (value: string | null | undefined): SignupStep =>
  STEPS.find((s) => s === (value === 'industry' ? 'business' : value)) ?? 'account';

// ---------------------------------------------------------------------------------------------
// Password (BR-73)

export const PASSWORD_MIN = 15;
export const PASSWORD_MAX = 128;

/** Lowercase, no accents, no spaces: `Mật khẩu 123456789` is the same password as `matkhau123456789`. */
const squash = (text: string) => fold(text).replace(/\s+/g, '');

const common = new Set(COMMON_PASSWORDS);

/** Error text for the password, or `null` when it is accepted. Length counts characters, not bytes. */
export function passwordError(password: string, lang: AuthLang = 'vi'): string | null {
  const e = AUTH_COPY[lang].errors;
  const length = [...password].length;
  if (length === 0) return e.passwordEmpty;
  if (length < PASSWORD_MIN) return e.passwordShort(PASSWORD_MIN);
  if (length > PASSWORD_MAX) return e.passwordLong(PASSWORD_MAX);
  if (common.has(squash(password))) return e.passwordCommon;
  return null;
}

// ---------------------------------------------------------------------------------------------
// Account

export const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

/** Emails of verified accounts: step 1 reports that the account exists (BR-74.10). */
const VERIFIED_EMAILS = accounts.map((account) => account.email);

export const isEmailTaken = (email: string) => VERIFIED_EMAILS.includes(email.trim().toLowerCase());

export function emailError(email: string, lang: AuthLang = 'vi'): string | null {
  const e = AUTH_COPY[lang].errors;
  if (!isEmail(email)) return e.emailInvalid;
  if (isEmailTaken(email)) return e.emailRegistered;
  return null;
}

// ---------------------------------------------------------------------------------------------
// Verification code

/** Any six digits are accepted except this one, which shows the error state. */
export const WRONG_CODE = '000000';
export const CODE_ATTEMPTS = 3;
export const CODE_MINUTES = 10;
export const FIRST_RESEND_SECONDS = 42;
export const RESEND_SECONDS = 60;

/** The codes the sample mailbox shows, one per email sent. */
const SAMPLE_CODES = ['482915', '730264', '195847'];
export const sampleCode = (sent: number) => SAMPLE_CODES[sent % SAMPLE_CODES.length]!;

/** `0:42`. */
export const formatResendIn = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

// ---------------------------------------------------------------------------------------------
// Address of the customer page (BR-72)

export const SLUG_MIN = 3;
export const SLUG_MAX = 40;

export const RESERVED_SLUGS = [
  'www',
  'app',
  'admin',
  'api',
  'mail',
  'status',
  'blog',
  'cdn',
  'signup',
  'login',
  'logout',
  'invite',
  'verify-email',
  'forgot-password',
  'reset-password',
  'select-workspace',
  'docs',
  'mock',
  'help',
  'about',
  'terms',
  'privacy',
  'static',
  'assets',
];

/** Format and reserved names: checked when the field loses focus. */
export function slugFormatError(slug: string, lang: AuthLang = 'vi'): string | null {
  const e = AUTH_COPY[lang].errors;
  if (!slug) return e.slugEmpty;
  if (!/^[a-z0-9-]+$/.test(slug)) return e.slugChars;
  if (slug.startsWith('-') || slug.endsWith('-')) return e.slugHyphen;
  if (slug.length < SLUG_MIN || slug.length > SLUG_MAX) return e.slugLength(SLUG_MIN, SLUG_MAX);
  if (RESERVED_SLUGS.includes(slug)) return e.slugReserved;
  return null;
}

/** Whether another tenant already uses the address; the real check is a request to the API. */
export const slugTaken = (slug: string) => tenantFixtures.some((f) => f.tenant.slug === slug);

/** "Salon Tóc Mây" → `salon-toc-may`: no accents, spaces become hyphens, cut to the limit. */
export function slugFromName(name: string): string {
  return fold(name)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX)
    .replace(/-+$/, '');
}

// ---------------------------------------------------------------------------------------------
// Resources

/** What the third step counts: the new tenant has these three non-staff types (D-16, BR-74.18). */
export const RESOURCE_KEYS = ['chairs', 'beds', 'rooms'] as const;
export type ResourceKey = (typeof RESOURCE_KEYS)[number];

export const DEFAULT_COUNTS: Record<ResourceKey, number> = { chairs: 1, beds: 0, rooms: 0 };

/** Minutes the customer is in the shop (the template screen of the platform admin reads it). */
export function sampleMinutes(variant: SampleServiceVariant): number {
  const lead = variant.segments.findIndex((segment) => segment.kind !== 'prep');
  return variant.segments
    .slice(lead < 0 ? variant.segments.length : lead)
    .reduce((sum, segment) => sum + segment.minutes, 0);
}

// ---------------------------------------------------------------------------------------------
// Business

export interface DayHours {
  open: boolean;
  from: string;
  to: string;
}

/** Monday first, as people read a week; `weekday` is the 0 = Sunday number of the fixtures. */
export const WEEK = [
  { weekday: 1, label: 'Thứ Hai' },
  { weekday: 2, label: 'Thứ Ba' },
  { weekday: 3, label: 'Thứ Tư' },
  { weekday: 4, label: 'Thứ Năm' },
  { weekday: 5, label: 'Thứ Sáu' },
  { weekday: 6, label: 'Thứ Bảy' },
  { weekday: 0, label: 'Chủ Nhật' },
] as const;

/** Every half hour from 06:00 to 23:00. */
export const HOUR_OPTIONS = Array.from({ length: 35 }, (_, i) => {
  const minutes = 6 * 60 + i * 30;
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${minutes % 60 ? '30' : '00'}`;
});

export const defaultHours = (): DayHours[] =>
  WEEK.map(({ weekday }) => ({ open: weekday !== 0, from: '08:00', to: '20:00' }));

export const COUNT_MIN = 0;
export const COUNT_MAX = 20;

export interface SignupDraft {
  fullName: string;
  email: string;
  /** The password itself is never stored; only that it passed. */
  passwordOk: boolean;
  terms: boolean;
  verified: boolean;
  businessName: string;
  slug: string;
  /** The owner typed in the address field, so the name no longer rewrites it. */
  slugEdited: boolean;
  branchName: string;
  phone: string;
  address: string;
  hours: DayHours[];
  /** How many of each non-staff resource type the first branch starts with. */
  counts: Record<ResourceKey, number>;
  created: boolean;
}

export const emptyDraft = (): SignupDraft => ({
  fullName: '',
  email: '',
  passwordOk: false,
  terms: false,
  verified: false,
  businessName: '',
  slug: '',
  slugEdited: false,
  branchName: '',
  phone: '',
  address: '',
  hours: defaultHours(),
  counts: { ...DEFAULT_COUNTS },
  created: false,
});

/** The count for one resource type: what the owner set, else the default. */
export const countOf = (draft: SignupDraft, key: ResourceKey) =>
  draft.counts[key] ?? DEFAULT_COUNTS[key];

/** A step can be opened only when every step before it is done. */
export function canOpen(step: SignupStep, draft: SignupDraft): boolean {
  switch (step) {
    case 'account':
      return true;
    case 'verify':
      return draft.passwordOk;
    case 'business':
      return draft.passwordOk && draft.verified;
    case 'done':
      return draft.created;
  }
}

/** The furthest step the draft allows: where a reload or a typed URL lands. */
export function furthestStep(draft: SignupDraft): SignupStep {
  return [...STEPS].reverse().find((step) => canOpen(step, draft)) ?? 'account';
}

export const isContactPhone = (value: string) =>
  /^0\d{9,10}$/.test(value.replace(/[\s.-]/g, '').replace(/^\+?84/, '0'));

export interface BusinessErrors {
  businessName?: string;
  slug?: string;
  branchName?: string;
  phone?: string;
  address?: string;
  hours?: string;
  /** Per weekday index in `WEEK`. */
  days: Record<number, string>;
}

export function businessErrors(draft: SignupDraft, lang: AuthLang = 'vi'): BusinessErrors {
  const e = AUTH_COPY[lang].errors;
  const errors: BusinessErrors = { days: {} };
  if (!draft.businessName.trim()) errors.businessName = e.businessName;
  const slug = slugFormatError(draft.slug, lang) ?? (slugTaken(draft.slug) ? e.slugTaken : null);
  if (slug) errors.slug = slug;
  if (!draft.branchName.trim()) errors.branchName = e.branchName;
  if (!isContactPhone(draft.phone)) errors.phone = e.phone;
  if (!draft.address.trim()) errors.address = e.address;
  if (!draft.hours.some((d) => d.open)) errors.hours = e.hoursNone;
  draft.hours.forEach((day, i) => {
    if (day.open && day.to <= day.from) errors.days[i] = e.hoursOrder;
  });
  return errors;
}

export const hasBusinessErrors = (e: BusinessErrors) =>
  Object.keys(e).some((k) => k !== 'days') || Object.keys(e.days).length > 0;

/** "2 ghế, 1 giường và 1 phòng": the resources of the first branch, in words; types with none are left out. */
export function describeResources(draft: SignupDraft, lang: AuthLang = 'vi'): string {
  const text = AUTH_COPY[lang].signup.business;
  const parts = RESOURCE_KEYS.filter((key) => countOf(draft, key) > 0).map((key) =>
    text.resources[key].count(countOf(draft, key)),
  );
  if (parts.length < 2) return parts.join('');
  return `${parts.slice(0, -1).join(', ')} ${text.and} ${parts.at(-1)}`;
}

/** BR-80: a new tenant tries Sapio for 7 days, counting the day it was created. */
export { TRIAL_DAYS } from './subscription';
