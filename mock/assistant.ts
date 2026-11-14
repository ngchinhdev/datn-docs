/*
 * The booking assistant of the customer page (MH-22, BR-92). It calls no AI: a question is read
 * for keywords, and the answer is a short text with cards whose numbers come from the fixture
 * through the same functions the booking page uses, the way the real one only calls tools (BT7).
 * The text never holds a price or a time; those live in the cards. Pure and given `now`; imports
 * only types and pure modules, so Node can run it (scripts/check-assistant.ts).
 */
import { ANY_STAFF, freeSlots } from './availability.ts';
import type { ChatbotSettings, Service, ServiceVariant, TenantFixture } from './fixtures/types.ts';
import { openingWindows } from './hours.ts';
import { matchesAttributes, priceRange, visibleMinutes } from './occupation.ts';
import { bookingWindow } from './policy.ts';
import { branchPhone } from './site.ts';
import { isRequired, parseDecimal } from './subject-schema.ts';
import { addDays, formatDay, formatTime, localDate, weekdayOf } from './time.ts';

// ---- What the assistant answers with ----

/** One variant of a service as the card shows it. */
export interface ServiceLine {
  variantId: string;
  name: string;
  /** Integer VND; the lowest among the people who do it (BR-56). */
  priceVnd: bigint;
  /** The price of the highest level, when it differs. */
  topPriceVnd?: bigint;
  /** What the customer sees, without the preparation (BR-51). */
  minutes: number;
  depositVnd?: bigint;
}

export interface SlotChoice {
  /** ISO 8601, UTC. */
  startAt: string;
  /** The person assigned; the one `pick` chose when the customer left it to the system (BR-14). */
  staffResourceId: string;
}

/** A card is data; the chat window draws it. */
export type AssistantCard =
  | { kind: 'service'; serviceId: string; name: string; lines: ServiceLine[] }
  | {
      kind: 'slots';
      serviceId: string;
      variantId: string;
      name: string;
      line: ServiceLine;
      /** The day the times are on, local `YYYY-MM-DD`. */
      date: string;
      /** The day the customer asked about, when no time was left on it. */
      askedDate?: string;
      /** Why the asked day has none. */
      askedReason?: 'closed' | 'full';
      /** `ANY_STAFF` or the person asked for (BR-14). */
      staffResourceId: string;
      staffName?: string;
      /** At most `MAX_SLOTS`, earliest first. */
      slots: SlotChoice[];
    }
  | {
      kind: 'hold';
      /** The held appointment on the calendar; its state is read from there. */
      appointmentId: string;
      serviceId: string;
      variantId: string;
      /** `ANY_STAFF` or the person asked for (BR-14). */
      staffChoice: string;
      slot: SlotChoice;
      /** ISO 8601, UTC (BR-07). */
      expiresAt: string;
    }
  | { kind: 'booked'; appointmentId: string; serviceId: string; variantId: string; startAt: string }
  | {
      kind: 'reception';
      branchName: string;
      address: string;
      phone: { tel: string; display: string };
      open: boolean;
      /** Local `HH:mm` the branch closes today, while open. */
      closesAt?: string;
      /** When it opens again, while closed: local date and `HH:mm`. */
      reopensDate?: string;
      reopensTime?: string;
    }
  | {
      kind: 'limit';
      reason: 'day' | 'month';
      limit: number;
      phone: { tel: string; display: string };
    };

/** A quick answer under a message. `variantId` answers a question about the variant directly. */
export interface Suggestion {
  label: string;
  variantId?: string;
}

export type Intent =
  | 'greeting'
  | 'priceList'
  | 'price'
  | 'slots'
  | 'pick'
  | 'ask'
  | 'reception'
  | 'link'
  | 'unknown'
  | 'limit';

export interface AssistantReply {
  intent: Intent;
  text: string;
  cards: AssistantCard[];
  suggestions: Suggestion[];
  links: { label: string; href: string }[];
  /** The customer named a time of the last card: the chat holds it as if the button was pressed. */
  pick?: { serviceId: string; variantId: string; slot: SlotChoice };
}

/** What the assistant remembers between messages of one chat. */
export interface AssistantState {
  context: {
    serviceId?: string;
    variantId?: string;
    attrs: Record<string, string>;
    staffResourceId?: string;
    lastSlots: SlotChoice[];
  };
  unknownStreak: number;
  /** Customer messages of `date`, and of the month for the whole shop (BR-67). */
  usage: { date: string; sent: number; monthSent: number };
}

export const MAX_SLOTS = 6;

export const initialState = (now: string): AssistantState => ({
  context: { attrs: {}, lastSlots: [] },
  unknownStreak: 0,
  usage: { date: localDate(now), sent: 0, monthSent: 0 },
});

// ---- Limits (BR-67) ----

/** Messages the customer sent today; the count starts again at 00:00 of the branch. */
export const sentToday = (state: AssistantState, now: string) =>
  state.usage.date === localDate(now) ? state.usage.sent : 0;

/** `month`: the shop used its turns; `day`: this customer did; `null`: still open. */
export function limitReached(
  settings: Pick<ChatbotSettings, 'perCustomerPerDay' | 'perShopPerMonth' | 'usedThisMonth'>,
  state: AssistantState,
  now: string,
): 'day' | 'month' | null {
  if (settings.usedThisMonth + state.usage.monthSent >= settings.perShopPerMonth) return 'month';
  if (sentToday(state, now) >= settings.perCustomerPerDay) return 'day';
  return null;
}

/** The mock tool that spends today's turns. */
export const withDayUsedUp = (
  state: AssistantState,
  settings: Pick<ChatbotSettings, 'perCustomerPerDay'>,
  now: string,
): AssistantState => ({
  ...state,
  usage: { ...state.usage, date: localDate(now), sent: settings.perCustomerPerDay },
});

// ---- Where the button shows (BR-92) ----

export type AssistantPage =
  'home' | 'service' | 'subject' | 'datetime' | 'info' | 'confirm' | 'deposit';

const HIDDEN_PAGES: AssistantPage[] = ['info', 'confirm', 'deposit'];

/** The shop turned it on, the plan has it, the page is not paused, and the step is not the last three. */
export function assistantAvailable(input: {
  enabled: boolean;
  planHasChatbot: boolean;
  suspended: boolean;
  page: AssistantPage;
}): boolean {
  return (
    input.enabled && input.planHasChatbot && !input.suspended && !HIDDEN_PAGES.includes(input.page)
  );
}

// ---- Reading a message ----

/** Lower case, no accents: how a customer types on a phone. */
const fold = (text: string) =>
  text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');

const wordsOf = (folded: string) => new Set(folded.split(/[^a-z0-9]+/).filter(Boolean));
const hasAny = (folded: string, phrases: readonly string[]) =>
  phrases.some((p) => new RegExp(`(^|[^a-z0-9])${p}([^a-z0-9]|$)`).test(folded));

/** Words too common to tell one service from another, or a value from a preposition. */
const STOP = new Set(['cho', 'va', 'tai', 'co', 'khong', 'la', 'the', 'ban', 'minh', 'toc']);

const GREETING = ['chao', 'xin chao', 'hello', 'hi', 'alo'];
const RECEPTION = [
  'le tan',
  'gap nguoi',
  'so dien thoai',
  'hotline',
  'goi dien',
  'goi cho tiem',
  'noi chuyen',
];
const OUT_OF_SCOPE = [
  'bi hu',
  'co hu',
  'hu khong',
  'co bi',
  'di ung',
  'benh',
  'tu van',
  'co nen',
  'nen khong',
  'khieu nai',
  'bao hanh',
];
/** A time typed as 9h30, 09:30, 10 giờ. */
const TIME = /(\d{1,2})\s*(?:h(?![a-z])|:|gio(?![a-z]))\s*(\d{2})?/;
const CHANGE = [
  'doi gio',
  'doi lich',
  'doi ngay',
  'doi sang',
  'huy',
  'huy lich',
  'huy hen',
  'doi hen',
];
const GROUP = ['nhom', 'nhieu dich vu', 'hai nguoi', 'ba nguoi', 'cung luc', 'ca nha', 'ban be'];
const PRICE_LIST = ['bang gia', 'menu', 'dich vu gi', 'co dich vu', 'nhung dich vu', 'gia dich vu'];
const PRICE = ['gia', 'bao nhieu', 'het bao nhieu', 'tien', 'phi', 'chi phi'];
const SLOT = [
  'gio',
  'con trong',
  'con cho',
  'lich trong',
  'con lich',
  'ranh',
  'dat duoc',
  'con khong',
];

const WEEKDAYS: [RegExp, number][] = [
  [/chu nhat|(^|[^a-z])cn([^a-z]|$)/, 0],
  [/thu (hai|2)/, 1],
  [/thu (ba|3)/, 2],
  [/thu (tu|4)/, 3],
  [/thu (nam|5)/, 4],
  [/thu (sau|6)/, 5],
  [/thu (bay|7)/, 6],
];

type Period = 'morning' | 'afternoon' | 'evening';

/**
 * "Tối" as the evening: with its accent in the message, or "tối nay" / "buổi tối" typed without
 * accents. Without accents a lone "toi" is "tôi", the pronoun.
 */
const isEvening = (text: string, folded: string) =>
  /(^|[^\p{L}])tối([^\p{L}]|$)/u.test(text.toLowerCase()) || /toi nay|buoi toi/.test(folded);

/** The day and the part of the day a message asks about. */
function readWhen(
  text: string,
  folded: string,
  today: string,
): { date: string | null; period: Period | null } {
  const period: Period | null = /\bsang\b/.test(folded)
    ? 'morning'
    : /\bchieu\b/.test(folded)
      ? 'afternoon'
      : isEvening(text, folded)
        ? 'evening'
        : null;
  if (/ngay mai/.test(folded)) return { date: addDays(today, 1), period };
  if (/ngay kia|ngay mot/.test(folded)) return { date: addDays(today, 2), period };
  const explicit = /(\d{1,2})\/(\d{1,2})/.exec(folded);
  if (explicit) {
    const month = explicit[2]!.padStart(2, '0');
    const day = explicit[1]!.padStart(2, '0');
    const year = Number(today.slice(0, 4));
    const date = `${year}-${month}-${day}`;
    return { date: date < today ? `${year + 1}-${month}-${day}` : date, period };
  }
  for (const [pattern, weekday] of WEEKDAYS) {
    if (!pattern.test(folded)) continue;
    const ahead = (weekday - weekdayOf(today) + 7) % 7;
    return { date: addDays(today, ahead), period };
  }
  if (/hom nay|\bnay\b/.test(folded) || period) return { date: today, period };
  return { date: null, period };
}

const bookable = (fixture: TenantFixture) => fixture.services.filter((s) => s.bookableOnline);

/** Services whose name best fits the message; more than one when they tie. */
function matchServices(fixture: TenantFixture, folded: string): Service[] {
  const words = wordsOf(folded);
  let best = 0;
  let found: Service[] = [];
  for (const service of bookable(fixture)) {
    const tokens = fold(service.name)
      .split(/\s+/)
      .filter((w) => w.length > 1);
    const score = tokens.filter((w) => words.has(w)).length;
    if (score === 0) continue;
    // A word every service shares ("tóc") only counts when nothing else matched.
    const distinct = tokens.filter((w) => words.has(w) && !STOP.has(w)).length;
    const weighted = distinct * 10 + score;
    if (weighted > best) {
      best = weighted;
      found = [service];
    } else if (weighted === best) found.push(service);
  }
  return found;
}

/** Values of the industry schema read from a message: "chó", "6 kg". */
function readAttributes(fixture: TenantFixture, text: string, folded: string) {
  const attrs: Record<string, string> = {};
  const lower = text.toLowerCase();
  const boundary = (word: string, source: string) =>
    new RegExp(
      `(?<![\\p{L}\\p{N}])${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}\\p{N}])`,
      'u',
    ).test(source);
  for (const field of fixture.template.subjectSchema) {
    if (field.type === 'enum') {
      const exact = field.options.find((o) => boundary(o.label.toLowerCase(), lower));
      const loose = field.options.find(
        (o) => !STOP.has(fold(o.label)) && boundary(fold(o.label), folded),
      );
      const option = exact ?? loose;
      if (option) attrs[field.key] = option.value;
    } else if (field.type === 'number' && field.unit) {
      const match = new RegExp(`(\\d+(?:[.,]\\d+)?)\\s*${fold(field.unit)}\\b`).exec(folded);
      if (match) attrs[field.key] = String(parseDecimal(match[1]!));
    }
  }
  return attrs;
}

/** The person the customer names, among those who do the service and take online bookings. */
function readStaff(fixture: TenantFixture, folded: string) {
  const text = folded.replace(/ngay mai/g, 'ngay_mai');
  return fixture.staff.find(
    (s) => s.profile.bookableOnline && wordsOf(text).has(fold(s.profile.displayName)),
  );
}

// ---- Building cards ----

export function lineOf(
  fixture: TenantFixture,
  service: Service,
  variant: ServiceVariant,
): ServiceLine {
  const staff = fixture.staff
    .filter((s) => s.profile.bookableOnline && s.skillServiceIds.includes(service.id))
    .map((s) => ({ resourceId: s.resourceId, level: s.level }));
  const [low, high] = priceRange(variant, staff);
  return {
    variantId: variant.id,
    name: variant.name,
    priceVnd: low,
    ...(high > low ? { topPriceVnd: high } : {}),
    minutes: visibleMinutes(variant),
    ...(variant.depositVnd ? { depositVnd: variant.depositVnd } : {}),
  };
}

const serviceCard = (
  fixture: TenantFixture,
  service: Service,
  variants: readonly ServiceVariant[],
): AssistantCard => ({
  kind: 'service',
  serviceId: service.id,
  name: service.name,
  lines: variants.map((v) => lineOf(fixture, service, v)),
});

function receptionCard(fixture: TenantFixture, now: string): AssistantCard {
  const branch = fixture.branches[0]!;
  const today = localDate(now);
  const clock = formatTime(now);
  const windows = openingWindows(fixture, today);
  const current = windows.find((w) => w.open <= clock && clock < w.close);
  const base = {
    kind: 'reception' as const,
    branchName: branch.name,
    address: branch.address,
    phone: branchPhone(fixture.tenant.slug, branch.phone),
  };
  if (current) return { ...base, open: true, closesAt: current.close };
  const later = windows.find((w) => w.open > clock);
  if (later) return { ...base, open: false, reopensDate: today, reopensTime: later.open };
  for (let i = 1; i <= 14; i++) {
    const date = addDays(today, i);
    const first = openingWindows(fixture, date)[0];
    if (first) return { ...base, open: false, reopensDate: date, reopensTime: first.open };
  }
  return { ...base, open: false };
}

const empty = (
  intent: Intent,
  text: string,
  extra: Partial<AssistantReply> = {},
): AssistantReply => ({
  intent,
  text,
  cards: [],
  suggestions: [],
  links: [],
  ...extra,
});

/** What the customer can tap first: from the first service that can be booked online. */
export function quickSuggestions(fixture: TenantFixture): Suggestion[] {
  const first = bookable(fixture)[0];
  const name = first ? first.name.toLowerCase() : 'dịch vụ';
  return [
    { label: 'Bảng giá dịch vụ' },
    { label: `Chiều nay còn giờ ${name} không?` },
    { label: 'Gặp lễ tân' },
  ];
}

// ---- The answer ----

export interface AskInput {
  text: string;
  /** A tap on a variant of a question the assistant asked. */
  variantId?: string;
  /** A button inside a card: not a turn (BR-67), not held back by the limit. */
  free?: boolean;
}

/** Times on one day for one variant, by the rules of the booking page (BR-06, BR-14). */
export function slotsOn(
  fixture: TenantFixture,
  service: Service,
  variant: ServiceVariant,
  staffResourceId: string,
  date: string,
  now: string,
): SlotChoice[] {
  const seen = new Set<string>();
  const out: SlotChoice[] = [];
  const found = freeSlots({
    fixture,
    variant,
    serviceId: service.id,
    date,
    staffResourceId,
    channel: 'online',
    now,
    ...bookingWindow(fixture.policies, now),
  });
  for (const slot of found) {
    if (seen.has(slot.startAt)) continue;
    seen.add(slot.startAt);
    out.push({ startAt: slot.startAt, staffResourceId: slot.staffResourceId });
  }
  return out;
}

const inPeriod = (slot: SlotChoice, period: Period | null) => {
  const time = formatTime(slot.startAt);
  if (period === 'morning') return time < '12:00';
  if (period === 'afternoon') return time >= '12:00';
  if (period === 'evening') return time >= '17:00';
  return true;
};

/**
 * Answers one message. A customer message (typed or a suggestion) is a turn: past the limit it is
 * not read and the limit card comes back (BR-67). A button inside a card is not.
 */
export function ask(
  fixture: TenantFixture,
  state: AssistantState,
  input: AskInput,
  now: string,
): { state: AssistantState; reply: AssistantReply } {
  const slug = fixture.tenant.slug;
  const phone = branchPhone(slug, fixture.branches[0]?.phone);
  const settings = fixture.config.chatbot;

  const reason = input.free ? null : limitReached(settings, state, now);
  if (reason) {
    const limit = reason === 'month' ? settings.perShopPerMonth : settings.perCustomerPerDay;
    return {
      state,
      reply: empty(
        'limit',
        reason === 'month'
          ? 'Trợ lý của tiệm đã dùng hết lượt trong tháng này. Bạn vẫn xem đủ giờ trống trên trang đặt lịch, hoặc gọi tiệm.'
          : 'Trợ lý nghỉ đến hết ngày hôm nay. Bạn vẫn xem đủ giờ trống trên trang đặt lịch, hoặc gọi tiệm.',
        {
          cards: [{ kind: 'limit', reason, limit, phone }],
          links: [{ label: 'Đặt trên trang', href: `/mock/${slug}/book` }],
        },
      ),
    };
  }

  const counted: AssistantState = input.free
    ? state
    : {
        ...state,
        usage: {
          date: localDate(now),
          sent: sentToday(state, now) + 1,
          monthSent: state.usage.monthSent + 1,
        },
      };
  const context = structuredClone(counted.context);
  const reply = interpret(fixture, counted, context, input, now);
  const slotsCard = reply.cards.find((c) => c.kind === 'slots');
  if (slotsCard) context.lastSlots = slotsCard.slots;
  return {
    state: {
      ...counted,
      context,
      unknownStreak: reply.intent === 'unknown' ? state.unknownStreak + 1 : 0,
    },
    reply,
  };
}

function interpret(
  fixture: TenantFixture,
  state: AssistantState,
  ctx: AssistantState['context'],
  input: AskInput,
  now: string,
): AssistantReply {
  const slug = fixture.tenant.slug;
  const today = localDate(now);
  const folded = fold(input.text);
  const subjectNoun = fixture.template.vocabulary.subject;

  const reception = (text: string, intent: Intent = 'reception') =>
    empty(intent, text, { cards: [receptionCard(fixture, now)] });

  if (hasAny(folded, RECEPTION)) {
    return reception(
      'Bạn gọi lễ tân nhé. Lễ tân nghe máy trong giờ mở cửa ở số dưới đây. Bạn vẫn có thể hỏi mình về giá và giờ trống.',
    );
  }
  if (hasAny(folded, OUT_OF_SCOPE)) {
    return reception(
      'Câu này cần người trong tiệm xem trực tiếp, mình không trả lời chắc được. Bạn gọi lễ tân nhé.',
    );
  }

  const named = matchServices(fixture, folded);
  const fullNames = bookable(fixture).filter((s) => folded.includes(fold(s.name)));
  if (fullNames.length > 1 || hasAny(folded, GROUP)) {
    return empty(
      'link',
      'Mình chỉ giữ chỗ một dịch vụ cho một người. Nhiều dịch vụ hoặc đặt cho nhiều người thì bạn chọn ngay trên trang đặt lịch nhé.',
      { links: [{ label: 'Mở trang đặt lịch', href: `/mock/${slug}/book` }] },
    );
  }
  if (hasAny(folded, CHANGE)) {
    return empty(
      'link',
      'Đổi giờ hoặc hủy lịch thì bạn làm trong Lịch của tôi, mình không sửa lịch đã đặt được.',
      { links: [{ label: 'Lịch của tôi', href: `/mock/${slug}/me` }] },
    );
  }

  // The service of this message, else the one of the chat so far.
  if (named.length > 1 && !input.variantId) {
    return empty('ask', 'Bạn muốn hỏi dịch vụ nào?', {
      suggestions: bookable(fixture)
        .filter((s) => named.includes(s))
        .map((s) => ({ label: s.name })),
    });
  }
  const when = readWhen(input.text, folded, today);
  const staff = readStaff(fixture, folded);
  const wantsList = hasAny(folded, PRICE_LIST);
  const wantsSlots =
    hasAny(folded, SLOT) || when.date !== null || staff !== undefined || TIME.test(folded);

  const service =
    named[0] ?? (ctx.serviceId ? fixture.services.find((s) => s.id === ctx.serviceId) : undefined);
  const attrs = { ...(named[0] && named[0].id !== ctx.serviceId ? {} : ctx.attrs) };
  Object.assign(attrs, readAttributes(fixture, input.text, folded));

  if (wantsList && !named[0]) {
    return empty('priceList', 'Đây là các dịch vụ bạn đặt được online.', {
      cards: bookable(fixture).map((s) => serviceCard(fixture, s, s.variants)),
    });
  }

  const greeted = hasAny(folded, GREETING);
  if (!service) {
    if (greeted) {
      return empty('greeting', fixture.config.chatbot.greeting, {
        suggestions: quickSuggestions(fixture),
      });
    }
    if ((wantsSlots || hasAny(folded, PRICE)) && bookable(fixture).length > 0) {
      return empty('ask', 'Bạn muốn hỏi dịch vụ nào?', {
        suggestions: bookable(fixture).map((s) => ({ label: s.name })),
      });
    }
    return unknown(fixture, state, now);
  }

  // The variant: named, tapped, or read from the subject's attributes (BR-13).
  let variant: ServiceVariant | undefined = input.variantId
    ? service.variants.find((v) => v.id === input.variantId)
    : undefined;
  if (!variant && service.variants.length === 1) variant = service.variants[0];
  if (!variant && service.variantSelection === 'customer') {
    const hit = service.variants.filter(
      (v) => folded.includes(fold(v.name)) || folded.includes(fold(v.shortName)),
    );
    variant =
      hit.length === 1
        ? hit[0]
        : ctx.serviceId === service.id && ctx.variantId
          ? service.variants.find((v) => v.id === ctx.variantId)
          : undefined;
  }
  if (!variant && service.variantSelection === 'subject') {
    const matching = service.variants.filter((v) => matchesAttributes(v.match, attrs));
    variant = matching.length === 1 ? matching[0] : undefined;
  }

  const context = (v?: ServiceVariant) => {
    ctx.serviceId = service.id;
    if (v) ctx.variantId = v.id;
    else delete ctx.variantId;
    ctx.attrs = attrs;
    if (staff) ctx.staffResourceId = staff.resourceId;
  };

  // Subject-chosen variant not settled yet: ask for what is missing, with the choices as taps.
  if (!variant && service.variantSelection === 'subject') {
    context();
    const missing = fixture.template.subjectSchema
      .filter((f) => isRequired(f, attrs) && attrs[f.key] === undefined)
      .map((f) => f.label.toLowerCase());
    const what = subjectNoun ? `${subjectNoun}` : 'đối tượng';
    return empty(
      'ask',
      `Giá ${service.name.toLowerCase()} tùy ${what}. ${
        missing.length > 0
          ? `Bạn cho mình biết ${missing.join(' và ')} của ${what} nhé.`
          : `Bạn chọn một trong các loại dưới đây nhé.`
      }`,
      { suggestions: service.variants.map((v) => ({ label: v.name, variantId: v.id })) },
    );
  }

  const timeOfDay = TIME.exec(folded);

  if (wantsSlots) {
    if (!variant) {
      context();
      return empty('ask', `Bạn làm ${service.name.toLowerCase()} loại nào?`, {
        suggestions: service.variants.map((v) => ({ label: v.name, variantId: v.id })),
      });
    }
    context(variant);

    // A time of the last card: hold it as if the button was pressed.
    if (timeOfDay && ctx.lastSlots.length > 0) {
      const hh = timeOfDay[1]!.padStart(2, '0');
      const mm = (timeOfDay[2] ?? '00').padStart(2, '0');
      const hit = ctx.lastSlots.find((s) => formatTime(s.startAt) === `${hh}:${mm}`);
      if (hit) {
        return empty('pick', 'Mình giữ chỗ giờ này cho bạn nhé.', {
          pick: { serviceId: service.id, variantId: variant.id, slot: hit },
        });
      }
      return empty(
        'slots',
        'Giờ đó không có trong các giờ trống vừa rồi. Bạn chọn một giờ trong thẻ, hoặc hỏi ngày khác nhé.',
      );
    }

    if (staff && !staff.skillServiceIds.includes(service.id)) {
      return empty(
        'ask',
        `${staff.profile.displayName} không làm ${service.name.toLowerCase()}. Bạn chọn thợ khác hoặc để tiệm xếp giúp nhé.`,
        { suggestions: [{ label: `${service.name} còn giờ không?` }] },
      );
    }
    const staffId = staff?.resourceId ?? ctx.staffResourceId ?? ANY_STAFF;
    const asked = when.date ?? today;
    let date = asked;
    let slots = slotsOn(fixture, service, variant, staffId, asked, now).filter((s) =>
      inPeriod(s, when.period),
    );
    let reasonEmpty: 'closed' | 'full' | undefined;
    if (slots.length === 0) {
      reasonEmpty = openingWindows(fixture, asked).length === 0 ? 'closed' : 'full';
      for (let i = 1; i <= 7 && slots.length === 0; i++) {
        date = addDays(asked, i);
        slots = slotsOn(fixture, service, variant, staffId, date, now);
      }
    }
    const line = lineOf(fixture, service, variant);
    if (slots.length === 0) {
      return empty(
        'slots',
        `${formatDay(asked)} chưa có giờ trống phù hợp trong thời gian đặt được. Bạn xem thêm trên trang đặt lịch hoặc gọi tiệm nhé.`,
        { links: [{ label: 'Xem trên trang đặt lịch', href: `/mock/${slug}/book` }] },
      );
    }
    const person =
      staffId === ANY_STAFF ? undefined : fixture.staff.find((s) => s.resourceId === staffId);
    const text =
      reasonEmpty === undefined
        ? `Đây là các giờ còn trống ${date === today ? 'hôm nay' : formatDay(date)}. Bạn bấm một giờ để mình giữ chỗ.`
        : `${formatDay(asked)} ${reasonEmpty === 'closed' ? 'tiệm nghỉ' : 'không còn giờ phù hợp'}. ${formatDay(date)} còn các giờ dưới đây.`;
    return empty('slots', text, {
      cards: [
        {
          kind: 'slots',
          serviceId: service.id,
          variantId: variant.id,
          name: `${service.name}${service.variants.length > 1 ? ` · ${variant.name}` : ''}`,
          line,
          date,
          ...(reasonEmpty ? { askedDate: asked, askedReason: reasonEmpty } : {}),
          staffResourceId: staffId,
          ...(person ? { staffName: person.profile.displayName } : {}),
          slots: slots.slice(0, MAX_SLOTS),
        },
      ],
    });
  }

  // Price: one variant when it is settled, else all of them.
  context(variant);
  const shown = variant ? [variant] : service.variants;
  const suggestions: Suggestion[] = [{ label: `${service.name} còn giờ không?` }];
  return empty('price', 'Đây là giá và thời lượng lấy từ bảng giá của tiệm.', {
    cards: [serviceCard(fixture, service, shown)],
    suggestions,
  });
}

function unknown(fixture: TenantFixture, state: AssistantState, now: string): AssistantReply {
  if (state.unknownStreak + 1 >= 2) {
    return empty(
      'reception',
      'Mình vẫn chưa hiểu ý bạn. Bạn gọi lễ tân để được giúp trực tiếp nhé.',
      { cards: [receptionCard(fixture, now)] },
    );
  }
  return empty(
    'unknown',
    'Mình chưa hiểu ý bạn. Mình xem được giá, giờ trống và giữ chỗ giúp bạn.',
    { suggestions: quickSuggestions(fixture) },
  );
}
