import { AUTH_COPY, type AuthLang } from './auth-copy';
import { fold } from './customers';
import { COMMON_PASSWORDS } from './fixtures/common-passwords';
import { industryTemplates } from './fixtures/templates';
import type { IndustryTemplate, SampleService, SampleServiceVariant } from './fixtures/types';
import { tenantFixtures } from './fixtures';
import { formatDuration, formatVnd } from './format';

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

/** One trial per verified email (BR-74); these already own a tenant. */
const REGISTERED_EMAILS = ['chinh@tocmay.vn'];

export function emailError(email: string, lang: AuthLang = 'vi'): string | null {
  const e = AUTH_COPY[lang].errors;
  if (!isEmail(email)) return e.emailInvalid;
  if (REGISTERED_EMAILS.includes(email.trim().toLowerCase())) return e.emailRegistered;
  return null;
}

// ---------------------------------------------------------------------------------------------
// Verification code

/** Any six digits are accepted except this one, which shows the error state. */
export const WRONG_CODE = '000000';
export const CODE_ATTEMPTS = 3;
export const FIRST_RESEND_SECONDS = 42;
export const RESEND_SECONDS = 60;

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
// Industries

export type IndustryId = 'salon' | 'nail' | 'spa' | 'pet';

/** Every new tenant starts from the hair salon template; sign-up does not ask for an industry. */
export const SIGNUP_INDUSTRY: IndustryId = 'salon';

export interface IndustryOption {
  id: IndustryId;
  title: string;
  description: string;
  /** The template this card installs; `null` while the template does not exist yet. */
  template: IndustryTemplate | null;
}

const SIGNUP_ID: Record<string, IndustryId> = {
  hair_salon: 'salon',
  nail_salon: 'nail',
  beauty_spa: 'spa',
  pet_spa: 'pet',
};

/** One card per template that is not hidden; only an `open` one can be picked (BR-70). */
export const industries: IndustryOption[] = industryTemplates
  .filter((t) => t.status !== 'hidden' && SIGNUP_ID[t.id])
  .map((t) => ({
    id: SIGNUP_ID[t.id]!,
    title: t.name,
    description: t.cardDescription,
    template: t.status === 'open' ? t : null,
  }));

export const industryById = (id: IndustryId | null) => industries.find((i) => i.id === id);

/** The resource types a tenant counts at sign-up: everything except the staff type. */
export const placedResourceTypes = (template: IndustryTemplate) =>
  template.resourceTypes.filter((type) => !type.isStaff);

/** Minutes the customer is in the shop: all segments except the preparation at the start. */
export function sampleMinutes(variant: SampleServiceVariant): number {
  const lead = variant.segments.findIndex((segment) => segment.kind !== 'prep');
  return variant.segments
    .slice(lead < 0 ? variant.segments.length : lead)
    .reduce((sum, segment) => sum + segment.minutes, 0);
}

export interface PreviewLine {
  label: string;
  detail: string;
}

/** The lines of the sample-service list: a line per variant, or one "từ …" line when the subject sets the price. */
export function previewLines(services: SampleService[]): PreviewLine[] {
  return services.flatMap((service) => {
    if (service.priceBySubject) {
      const lowest = service.variants.reduce((a, b) => (b.priceVnd < a.priceVnd ? b : a));
      return [{ label: service.name, detail: `từ ${formatVnd(lowest.priceVnd)}` }];
    }
    const single = service.variants.length === 1;
    return service.variants.map((variant) => ({
      label: single ? service.name : `${service.name} · ${variant.name}`,
      detail: `${formatDuration(sampleMinutes(variant))} · ${formatVnd(variant.priceVnd)}`,
    }));
  });
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

export const COUNT_MIN = 1;
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
  /** Resource count by the template's resource type name. */
  counts: Record<string, number>;
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
  counts: {},
  created: false,
});

/** The count for one resource type: what the owner set, else the template's suggestion. */
export const countOf = (draft: SignupDraft, name: string, fallback: number) =>
  draft.counts[name] ?? fallback;

/** A step can be opened only when every step before it is done. */
export function canOpen(step: SignupStep, draft: SignupDraft): boolean {
  switch (step) {
    case 'account':
      return true;
    case 'verify':
      return draft.passwordOk;
    case 'business':
      return draft.passwordOk && draft.verified && Boolean(industryById(SIGNUP_INDUSTRY)?.template);
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

/** "3 ghế cắt và 1 giường gội": the resources of the first branch, in words. */
export function describeResources(draft: SignupDraft, template: IndustryTemplate): string {
  const parts = placedResourceTypes(template).map(
    (type) => `${countOf(draft, type.name, type.defaultCount)} ${type.name.toLowerCase()}`,
  );
  if (parts.length < 2) return parts.join('');
  return `${parts.slice(0, -1).join(', ')} và ${parts.at(-1)}`;
}

/** BR-80: a new tenant tries Sapio for 7 days, counting the day it was created. */
export { TRIAL_DAYS } from './subscription';
