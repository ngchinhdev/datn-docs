'use client';

import { ArrowLeft } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { useQueryState } from '@/components/mock/use-query-state';
import { BottomBar } from '@/components/sapio/bottom-bar';
import { Button } from '@/components/sapio/button';
import { ChainPlan, type PlanItem } from '@/components/sapio/chain-plan';
import { DateStrip } from '@/components/sapio/date-strip';
import { Field } from '@/components/sapio/form';
import { HoldBanner } from '@/components/sapio/hold-banner';
import { OtpField } from '@/components/sapio/otp-field';
import { PerServiceStaff } from '@/components/sapio/per-service-staff';
import { PhoneField } from '@/components/sapio/phone-field';
import { QuantityInput } from '@/components/sapio/quantity-input';
import { SegmentedTabs } from '@/components/sapio/segmented';
import { ServiceCart } from '@/components/sapio/service-cart';
import { SubjectFields } from '@/components/sapio/subject-fields';
import { ServiceVariantList } from '@/components/sapio/service-variant-list';
import { SlotGrid } from '@/components/sapio/slot-grid';
import {
  ANY_STAFF,
  StaffOptionList,
  StaffPicker,
  type StaffOption,
} from '@/components/sapio/staff-picker';
import { StatusBadge } from '@/components/sapio/status-badge';
import { useToast } from '@/components/sapio/toast';
import {
  nextDraftId,
  useBookingDraft,
  type BookingDraft,
  type BookingState,
  type ChainPick,
  type Person,
  type SubjectDraft as Draft,
} from '@/components/mock/booking-draft';
import { downloadIcs } from '@/components/mock/download-ics';
import { useBookingCommit } from '@/components/mock/use-booking-commit';
import { useMockNow } from '@/components/sapio/use-mock-now';
import { cn } from '@/lib/utils';
import { freeChainSlots, freeGroupSlots, type FreeChainSlot } from '@/mock/availability';
import { slotKey, type BookingSlot } from '@/mock/booking';
import { matchesAttributes, priceFor, priceRange, visibleMinutes } from '@/mock/occupation';
import {
  tenantFixtures,
  type ServedSubject,
  type Service,
  type ServiceVariant,
} from '@/mock/fixtures';
import { formatMinutes, formatPhone, formatVnd, normalizePhone } from '@/mock/format';
import { openingHours } from '@/mock/hours';
import {
  askedFields,
  checkSubject,
  describeSubject,
  priceFactors,
  type SubjectValues,
} from '@/mock/subject-schema';
import {
  addDays,
  addMinutes,
  formatDay,
  formatTime,
  localDate,
  MOCK_NOW,
  weekdayShort,
} from '@/mock/time';

type Step = 'service' | 'subject' | 'datetime' | 'info' | 'confirm';
type Part = 'morning' | 'afternoon' | 'evening';

const HOLD_MINUTES = 10;
/** BR-18: at most four services in one booking. */
const MAX_CHAIN = 4;
/** `staffChoice` when the services of a chain have different people. */
const MIXED = 'mixed';
/** BR-19: at most four subjects in one booking. */
const MAX_PARTY = 4;
/** Staggered suggestions shown per part of the day (BR-19). */
const STAGGERED_PER_PART = 3;
const RELEASED = 'Chỗ đã được trả lại. Chọn giờ khác.';
/** A returning customer has a session, so their saved served subjects show (BR-17). */
const RETURNING_CUSTOMER: Record<string, string> = { may: 'may-c-thu', pawpaw: 'paw-c-linh' };
const PARTS: { value: Part; label: string; from: number; to: number }[] = [
  { value: 'morning', label: 'Sáng', from: 0, to: 12 },
  { value: 'afternoon', label: 'Chiều', from: 12, to: 17 },
  { value: 'evening', label: 'Tối', from: 17, to: 24 },
];

const duration = visibleMinutes;
const matches = (v: ServiceVariant, subject: ServedSubject) =>
  matchesAttributes(v.match, subject.attributes);
interface ChainItem {
  /** Service id in a chain; subject or person id in a group. */
  key: string;
  /** Name of the subject or person in a group. */
  label?: string;
  service: Service;
  variant: ServiceVariant;
}
const partOf = (slot: FreeChainSlot) => {
  const hour = Number(formatTime(slot.startAt).slice(0, 2));
  return PARTS.find((p) => hour >= p.from && hour < p.to)?.value ?? 'evening';
};
const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());

interface Cta {
  title: string;
  subtitle?: string | undefined;
  label: string;
  disabled: boolean;
  onClick: () => void;
}

export function BookingFlow({
  tenantSlug,
  newCustomer,
  bookingOpen = true,
}: {
  tenantSlug: string;
  newCustomer: boolean;
  /** `false` while the tenant is on trial (BR-81): the page can be walked through, not booked. */
  bookingOpen?: boolean;
}) {
  const fixture = tenantFixtures.find((f) => f.tenant.slug === tenantSlug) ?? tenantFixtures[0]!;
  const { tenant, services, staff, resources } = fixture;
  const branch = fixture.branches[0]!;
  const toast = useToast();
  const { vocabulary, subjectSchema } = fixture.template;
  const staffNoun = vocabulary.staff;
  /** BR-56: who is asked decides the price; people who can do the service, online only (BR-14). */
  const pricedStaff = (forService: string) =>
    staff
      .filter((s) => s.profile.bookableOnline && s.skillServiceIds.includes(forService))
      .map((s) => ({ resourceId: s.resourceId, level: s.level }));
  const priceOf = (v: ServiceVariant, forService: string, who: string = ANY_STAFF) =>
    priceFor(v, who, pricedStaff(forService));
  const subjectNoun = vocabulary.subject ?? '';
  const asksSubject = vocabulary.subject !== null;
  const saved = newCustomer
    ? []
    : fixture.servedSubjects.filter((s) => s.customerId === RETURNING_CUSTOMER[tenant.id]);
  const steps: Step[] = asksSubject
    ? ['subject', 'datetime', 'info', 'confirm']
    : ['service', 'datetime', 'info', 'confirm'];

  const router = useRouter();
  const query = useSearchParams();
  const { draft: held, setDraft } = useBookingDraft();
  const { commit, release } = useBookingCommit(tenantSlug);
  // Coming back from the payment page (`giu=1`) picks the choices up where they were left.
  const [resume] = useState(
    query.get('giu') === '1' && held?.tenantSlug === tenantSlug ? held : null,
  );
  const saved0 = resume?.state ?? null;
  const now = useMockNow(resume?.now);
  const holdAlive = Boolean(
    saved0?.holdExpiresAt && Date.parse(saved0.holdExpiresAt) > Date.parse(resume?.now ?? MOCK_NOW),
  );
  const today = localDate(MOCK_NOW);
  const [stepParam, setStepParam] = useQueryState('step', steps[0]!);
  const preset = query.get('service');
  const presetService = services.find((s) => s.id === preset);
  // Industries without a served subject build a chain of up to four services (BR-18).
  const [picks, setPicks] = useState<ChainPick[]>(
    saved0?.picks ??
      (!asksSubject && presetService && presetService.variants[0]
        ? [{ serviceId: presetService.id, variantId: presetService.variants[0].id }]
        : []),
  );
  const [staffByKey, setStaffByKey] = useState<Record<string, string>>(saved0?.staffByKey ?? {});
  const [perServiceOpen, setPerServiceOpen] = useState(false);
  // Served subjects: a new customer starts with one blank form; a returning one picks saved ones.
  const [drafts, setDrafts] = useState<Draft[]>(
    saved0?.drafts ??
      (asksSubject && newCustomer ? [{ id: 'new-1', name: '', values: {}, touched: [] }] : []),
  );
  const [chosenIds, setChosenIds] = useState<string[]>(
    saved0?.chosenIds ?? (asksSubject && newCustomer ? ['new-1'] : []),
  );
  const [serviceFor, setServiceFor] = useState<Record<string, string>>(saved0?.serviceFor ?? {});
  // Without a served subject, "Đặt cho nhiều người" turns the booking into a group (BR-19).
  const [people, setPeople] = useState<Person[] | null>(saved0?.people ?? null);
  const [changing, setChanging] = useState<string[]>([]);
  const [date, setDate] = useState(saved0?.date ?? today);
  const [part, setPart] = useState<Part | null>(null);
  const [slot, setSlot] = useState<BookingSlot | null>(holdAlive ? (saved0?.slot ?? null) : null);
  const [holdExpiresAt, setHoldExpiresAt] = useState<string | null>(
    holdAlive ? (saved0?.holdExpiresAt ?? null) : null,
  );
  const [notice, setNotice] = useState<string | null>(query.get('het') === '1' ? RELEASED : null);
  const [name, setName] = useState(saved0?.name ?? '');
  const [phone, setPhone] = useState(saved0?.phone ?? '');
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [email, setEmail] = useState(saved0?.email ?? '');
  const [emailTouched, setEmailTouched] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  const checks = Object.fromEntries(
    drafts.map((d) => [d.id, checkSubject(subjectSchema, subjectNoun, d.name, d.values)]),
  );
  const draftSubject = (d: Draft): ServedSubject | null =>
    Object.keys(checks[d.id]!.errors).length === 0
      ? {
          id: d.id,
          tenantId: tenant.id,
          customerId: '',
          kind: 'other',
          name: d.name.trim(),
          attributes: checks[d.id]!.attributes,
        }
      : null;
  const subjectOf = (id: string) =>
    saved.find((x) => x.id === id) ??
    drafts.filter((d) => d.id === id).map(draftSubject)[0] ??
    null;
  /** BR-13: the variant of a service follows the attributes of the subject. */
  const servicesFor = (subject: ServedSubject) =>
    services.filter((sv) => sv.variants.some((v) => matches(v, subject)));
  const serviceOf = (subject: ServedSubject, id: string) => {
    const matching = servicesFor(subject);
    return (
      matching.find((sv) => sv.id === serviceFor[id]) ??
      matching.find((sv) => sv.id === presetService?.id) ??
      matching[0] ??
      null
    );
  };
  const rawItems: ChainItem[] = asksSubject
    ? chosenIds.flatMap((id) => {
        const subject = subjectOf(id);
        const sv = subject && serviceOf(subject, id);
        const v = subject && sv ? sv.variants.find((x) => matches(x, subject)) : undefined;
        return subject && sv && v
          ? [{ key: id, label: subject.name, service: sv, variant: v }]
          : [];
      })
    : people
      ? people.flatMap((person, i) => {
          const sv = services.find((x) => x.id === person.pick?.serviceId);
          const v = sv?.variants.find((x) => x.id === person.pick?.variantId);
          return sv && v && (i === 0 || person.name.trim())
            ? [
                {
                  key: person.id,
                  label: i === 0 ? 'Bạn' : person.name.trim(),
                  service: sv,
                  variant: v,
                },
              ]
            : [];
        })
      : picks.flatMap((pick) => {
          const sv = services.find((x) => x.id === pick.serviceId);
          const v = sv?.variants.find((x) => x.id === pick.variantId);
          return sv && v ? [{ key: sv.id, service: sv, variant: v }] : [];
        });
  const itemSig = rawItems
    .map((it) => `${it.key}:${it.label}:${it.service.id}:${it.variant.id}`)
    .join('|');
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `itemSig` stands for `rawItems`
  const items = useMemo(() => rawItems, [itemSig]);
  const wanted = asksSubject ? chosenIds.length : people ? people.length : picks.length;
  /** Every subject or person asked for has a service. */
  const complete = items.length > 0 && items.length === wanted;
  const variant = items[0]?.variant ?? null;
  const group = (asksSubject || people !== null) && items.length > 1;
  const chain = !asksSubject && people === null && items.length > 1;
  const unit = vocabulary.subject ?? 'người';
  const choices = items.map((it) => staffByKey[it.key] ?? ANY_STAFF);
  const choiceKey = choices.join('|');
  /** One value when everyone asked for is the same, else `MIXED`. */
  const staffChoice = choices.every((c) => c === choices[0]) ? (choices[0] ?? ANY_STAFF) : MIXED;
  // `?step=` is the source; a link to a step whose choices are missing falls back to the first step.
  const reachable: Record<Step, boolean> = {
    service: true,
    subject: true,
    datetime: complete,
    info: Boolean(slot),
    confirm: Boolean(slot),
  };
  const requested = steps.find((st) => st === stepParam);
  const step: Step = requested && reachable[requested] ? requested : steps[0]!;
  const stepIndex = steps.indexOf(step);
  const staffName = (id: string) => resources.find((r) => r.id === id)?.name ?? '';
  const sum = (xs: bigint[]) => xs.reduce((a, b) => a + b, 0n);
  /** BR-18, BR-56: the price and the deposit are the sums of the items. */
  const price = sum(items.map((it, i) => priceOf(it.variant, it.service.id, choices[i])));
  const anyPrice = sum(items.map((it) => priceOf(it.variant, it.service.id)));
  const deposit = sum(items.map((it) => it.variant.depositVnd ?? 0n));
  const totalMinutes = items.reduce((m, it) => m + duration(it.variant), 0);

  const week = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(today, i)), [today]);
  const queryFor = useCallback(
    (day: string, who: readonly string[]) => ({
      fixture,
      date: day,
      notBefore: MOCK_NOW,
      items: items.map((it, i) => ({
        variant: it.variant,
        serviceId: it.service.id,
        staffResourceId: who[i] ?? ANY_STAFF,
      })),
    }),
    [fixture, items],
  );
  /** Times everyone starts at once (a group) or the whole chain fits (BR-18, BR-19). */
  const slotsFor = useCallback(
    (day: string, who: readonly string[]): BookingSlot[] =>
      items.length === 0
        ? []
        : group
          ? freeGroupSlots(queryFor(day, who)).together
          : freeChainSlots(queryFor(day, who)),
    [items, group, queryFor],
  );
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `choiceKey` stands for `choices`
  const daySlots = useMemo(() => slotsFor(date, choices), [slotsFor, date, choiceKey]);
  // BR-19: without a common time, combinations that start up to 60 minutes apart.
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `choiceKey` stands for `choices`
  const staggeredSlots: BookingSlot[] = useMemo(
    () =>
      group
        ? freeGroupSlots(queryFor(date, choices)).staggered.map((x) => ({
            ...x,
            staggered: true as const,
          }))
        : [],
    [group, queryFor, date, choiceKey],
  );
  const staggeredIn = (value: Part) =>
    staggeredSlots.filter((x) => partOf(x) === value).slice(0, STAGGERED_PER_PART);
  const partCounts = Object.fromEntries(
    PARTS.map((pt) => [
      pt.value,
      daySlots.filter((x) => partOf(x) === pt.value).length + staggeredIn(pt.value).length,
    ]),
  ) as Record<Part, number>;
  // D-14: default to the earliest part of day that still has slots.
  const firstPart = PARTS.find((pt) => partCounts[pt.value] > 0)?.value ?? 'morning';
  const shownPart = part && partCounts[part] > 0 ? part : firstPart;

  // BR-14: only online-bookable staff who can do the service.
  const staffOptions: StaffOption[] = useMemo(
    () =>
      staff
        .filter(
          (s) =>
            !group &&
            s.profile.bookableOnline &&
            items.length > 0 &&
            items.every((it) => s.skillServiceIds.includes(it.service.id)),
        )
        .map((s) => {
          const own = items.map(() => s.resourceId);
          const first = slotsFor(date, own)[0];
          const nextDay = first
            ? undefined
            : week
                .filter((d) => d > date)
                .map((d) => ({ d, slot: slotsFor(d, own)[0] }))
                .find((x) => x.slot);
          return {
            id: s.resourceId,
            displayName: s.profile.displayName,
            title: s.profile.title,
            specialty: s.profile.specialty,
            earliest: first ? formatTime(first.startAt) : null,
            price: formatVnd(
              sum(items.map((it) => priceOf(it.variant, it.service.id, s.resourceId))),
            ),
            nextDay: nextDay?.slot
              ? `Sớm nhất ${weekdayShort(nextDay.d)} ${formatDay(nextDay.d).slice(-5)}`
              : undefined,
          };
        }),
    [staff, items, group, slotsFor, date, week],
  );

  const heldRef = useRef(held);
  heldRef.current = held;
  const releaseRef = useRef(release);
  releaseRef.current = release;
  const releaseHold = useCallback(() => {
    if (heldRef.current) releaseRef.current(heldRef.current);
    setSlot(null);
    setHoldExpiresAt(null);
    setConfirmed(false);
    setNotice(RELEASED);
    setStepParam('datetime');
  }, [setStepParam]);

  const go = (next: Step) => {
    setNotice(null);
    setStepParam(next, 'push');
  };
  const back = () => {
    const prev = steps[stepIndex - 1];
    if (prev) go(prev);
  };

  function pickBookingSlot(found: BookingSlot | null) {
    setSlot(found);
    // BR-07: choosing a time starts a 10-minute hold.
    setHoldExpiresAt(found && bookingOpen ? addMinutes(now, HOLD_MINUTES) : null);
    setNotice(null);
  }
  const pickSlot = (startAt: string) =>
    pickBookingSlot(daySlots.find((x) => x.startAt === startAt) ?? null);
  const reset = () => {
    setSlot(null);
    setHoldExpiresAt(null);
    setPart(null);
  };
  /** One person for the whole chain. */
  function chooseStaff(v: string) {
    setStaffByKey(Object.fromEntries(items.map((it) => [it.key, v])));
    reset();
  }
  function applyPerService(values: Record<string, string>) {
    setStaffByKey(values);
    reset();
  }
  /** Adding a variant of a service already in the chain replaces it; the limit is BR-18. */
  function togglePick(serviceId: string, variantId: string) {
    setPicks((current) => {
      const same = current.find((x) => x.serviceId === serviceId);
      if (same?.variantId === variantId) return current.filter((x) => x !== same);
      if (same) return current.map((x) => (x === same ? { serviceId, variantId } : x));
      return current.length >= MAX_CHAIN ? current : [...current, { serviceId, variantId }];
    });
    reset();
  }
  function togglePet(id: string) {
    setChosenIds((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : cur.length >= MAX_PARTY ? cur : [...cur, id],
    );
    reset();
  }
  function addDraft() {
    if (chosenIds.length >= MAX_PARTY) return;
    const id = `new-${drafts.reduce((m, d) => Math.max(m, Number(d.id.slice(4))), 0) + 1}`;
    setDrafts((cur) => [...cur, { id, name: '', values: {}, touched: [] }]);
    setChosenIds((cur) => [...cur, id]);
    reset();
  }
  function removeDraft(id: string) {
    setDrafts((cur) => cur.filter((d) => d.id !== id));
    setChosenIds((cur) => cur.filter((x) => x !== id));
    reset();
  }
  function patchDraft(id: string, patch: (d: Draft) => Draft) {
    setDrafts((cur) => cur.map((d) => (d.id === id ? patch(d) : d)));
    reset();
  }
  function startGroup() {
    const first = picks[0] ?? null;
    setPeople([
      { id: 'p1', name: 'Bạn', pick: first },
      { id: 'p2', name: '', pick: null },
    ]);
    setChanging(first ? ['p2'] : ['p1', 'p2']);
    reset();
  }
  function endGroup() {
    const first = people?.[0]?.pick;
    setPicks(first ? [first] : []);
    setPeople(null);
    reset();
  }
  function setPartySize(n: number) {
    if (!people) return;
    const more = Array.from({ length: Math.max(0, n - people.length) }, (_, k) => ({
      id: `p${people.length + k + 1}`,
      name: '',
      pick: null as ChainPick | null,
    }));
    setPeople([...people.slice(0, n), ...more]);
    setChanging((c) => [...c, ...more.map((m) => m.id)]);
    reset();
  }
  function patchPerson(id: string, patch: Partial<Person>) {
    setPeople((cur) => cur && cur.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    reset();
  }
  function pickForPerson(id: string, serviceId: string, variantId: string) {
    patchPerson(id, { pick: { serviceId, variantId } });
    setChanging((c) => c.filter((x) => x !== id));
  }
  function movePick(serviceId: string, by: -1 | 1) {
    setPicks((current) => {
      const at = current.findIndex((p) => p.serviceId === serviceId);
      const to = at + by;
      if (at < 0 || to < 0 || to >= current.length) return current;
      const next = [...current];
      [next[at], next[to]] = [next[to]!, next[at]!];
      return next;
    });
    reset();
  }
  function removePick(serviceId: string) {
    setPicks((current) => current.filter((p) => p.serviceId !== serviceId));
    reset();
  }

  /** BR-29: a booking with a deposit goes to the payment page, keeping the hold it already has. */
  function confirmBooking() {
    if (!slot || !holdExpiresAt) return;
    const next: BookingDraft = {
      id: held?.tenantSlug === tenantSlug ? held.id : nextDraftId(),
      tenantSlug,
      newCustomer,
      state: {
        picks,
        people,
        chosenIds,
        drafts,
        serviceFor,
        staffByKey,
        date,
        name,
        phone,
        email,
        slot,
        holdExpiresAt,
      } satisfies BookingState,
      refs: items.map((it, i) => {
        const fresh = drafts.find((d) => d.id === it.key);
        const made = fresh ? draftSubject(fresh) : null;
        return {
          key: it.key,
          ...(it.label ? { label: it.label } : {}),
          serviceId: it.service.id,
          variantId: it.variant.id,
          staffChoice: choices[i] ?? ANY_STAFF,
          ...(made ? { newSubject: made } : {}),
        };
      }),
      mode: group ? 'group' : chain ? 'chain' : 'single',
      slot,
      holdExpiresAt,
      now,
      contact: { name: name.trim(), phone: phoneE164 ?? '', email: email.trim() },
      priceVnd: price,
      depositVnd: deposit,
      display: {
        slotLine,
        people: peopleNames,
        plan: planItems,
        day: formatDay(localDate(slot.startAt)),
      },
    };
    if (deposit > 0n) {
      commit(next, 'held');
      setDraft(next);
      router.push(`/mock/${tenantSlug}/book/pay`);
      return;
    }
    commit(next, 'confirmed');
    setDraft(null);
    setConfirmed(true);
  }

  const phoneE164 = normalizePhone(phone);
  const phoneError =
    phoneTouched && !phoneE164 ? 'Số điện thoại chưa đúng. Ví dụ: 0912 345 678.' : null;
  const emailError =
    emailTouched && !isEmail(email) ? 'Email chưa đúng. Ví dụ: thu@example.com.' : null;
  const infoReady =
    name.trim().length > 0 && Boolean(phoneE164) && isEmail(email) && /^\d{6}$/.test(otp);

  /** "Mochi 10:00 · Lucky 10:30", in the order they start. */
  const comboLabel = (x: BookingSlot) =>
    x.items
      .map((it, i) => ({ label: items[i]?.label ?? '', at: it.startAt }))
      .sort((a, b) => a.at.localeCompare(b.at))
      .map((o) => `${o.label} ${formatTime(o.at)}`)
      .join(' · ');
  const slotLine = slot
    ? slot.staggered
      ? `${comboLabel(slot)} · ${formatDay(localDate(slot.startAt))}`
      : `${formatTime(slot.startAt)}${chain ? `–${formatTime(slot.endAt)}` : ''} · ${formatDay(localDate(slot.startAt))}`
    : '';
  const peopleNames = slot
    ? [...new Set(slot.items.map((it) => staffName(it.staffResourceId)))].join(', ')
    : '';
  const assignedStaff = slot
    ? choices.includes(ANY_STAFF)
      ? `${peopleNames}, xếp tự động`
      : peopleNames
    : '';
  const itemTitle = (it: ChainItem) =>
    it.label ? `${it.label} · ${it.service.name}` : `${it.service.name} · ${it.variant.name}`;
  const serviceTitle = (it: ChainItem) => `${it.service.name} · ${it.variant.name}`;

  /** "Lịch của bạn" (MH-13, MH-14): the time, the person and the waits of each item. */
  const planItems: PlanItem[] = slot
    ? slot.items.map((placed, i) => {
        const it = items[i]!;
        const previous = slot.items[i - 1];
        const gap =
          chain && previous
            ? (Date.parse(placed.startAt) - Date.parse(previous.endAt)) / 60_000
            : 0;
        const segment = (kind: 'prep' | 'wait') => it.variant.segments.find((x) => x.kind === kind);
        const wait = it.variant.segments
          .filter((x) => x.kind === 'wait')
          .reduce((m, x) => m + x.endMinute - x.startMinute, 0);
        return {
          id: it.key,
          time: `${formatTime(placed.startAt)}–${formatTime(placed.endAt)}`,
          title: itemTitle(it),
          note: [
            staffName(placed.staffResourceId),
            gap > 0 ? `chờ ${gap} phút (${segment('prep')?.name.toLowerCase() ?? 'chuẩn bị'})` : '',
            wait > 0 ? `có ${wait} phút ${segment('wait')?.name.toLowerCase() ?? 'chờ'}` : '',
          ]
            .filter(Boolean)
            .join(' · '),
        };
      })
    : [];
  const plan = slot && (chain || group) && (
    <ChainPlan
      heading={`Lịch của bạn, ${formatDay(localDate(slot.startAt))}`}
      items={planItems}
      footer={`Xong khoảng ${formatTime(slot.endAt)}.`}
    />
  );

  const summary = items.length > 0 && (
    <div className="flex flex-col gap-(--space-2) rounded-(--radius-md) bg-(--fill-tonal) p-(--space-4)">
      {items.map((it, i) => (
        <div key={it.key} className="flex items-start justify-between gap-(--space-2)">
          <div className="flex min-w-0 flex-col gap-(--space-1)">
            <span className="body font-semibold">{itemTitle(it)}</span>
            <span className="body-sm sp-num text-(--ink-muted)">
              {it.label ? `${it.variant.name} · ` : ''}
              {formatMinutes(duration(it.variant))} ·{' '}
              {formatVnd(priceOf(it.variant, it.service.id, choices[i]))}
            </span>
          </div>
          {i === 0 && step !== steps[0] && !confirmed && (
            <Button variant="ghost" size="sm" onClick={() => go(steps[0]!)}>
              Đổi
            </Button>
          )}
        </div>
      ))}
      {(chain || group) && (
        <span className="body-sm sp-num border-t border-(--line) pt-(--space-2) text-(--ink-muted)">
          Tổng {chain && `${formatMinutes(totalMinutes)} · `}
          {formatVnd(price)}
          {deposit > 0n && ` · cọc ${formatVnd(deposit)}`}
        </span>
      )}
    </div>
  );

  const hold = holdExpiresAt && slot && !confirmed && (step === 'info' || step === 'confirm') && (
    <HoldBanner
      expiresAt={holdExpiresAt}
      now={now}
      note={`${slotLine} · ${peopleNames}`}
      onExpire={releaseHold}
    />
  );

  /** The picker's props: the same for the phone row and the desktop list. */
  const staffPickerProps = {
    noun: staffNoun,
    options: staffOptions,
    value: staffChoice,
    onChange: chooseStaff,
    anyEarliest: daySlots[0] ? formatTime(daySlots[0].startAt) : null,
    anyPrice: items.length > 0 ? formatVnd(anyPrice) : undefined,
    anyNote: chain ? `Tiệm xếp ${staffNoun.toLowerCase()} cho từng dịch vụ` : undefined,
  };
  const perServiceLink = chain && (
    <button
      type="button"
      className="body-sm min-h-11 self-start border-0 bg-transparent p-0 font-medium text-(--accent) hover:underline"
      onClick={() => setPerServiceOpen(true)}
    >
      Chọn {staffNoun.toLowerCase()} riêng cho từng dịch vụ
    </button>
  );
  /** BR-19: each subject has its own person; the row opens the same sheet as a chain. */
  const groupStaffCard = group && (
    <div className="flex items-center justify-between gap-(--space-3) rounded-(--radius-lg) bg-(--surface-raised) px-(--space-4) py-(--space-3) shadow-[0_0_0_1px_var(--line)]">
      <span className="flex min-w-0 flex-col">
        <span className="body-sm text-(--ink-muted)">{staffNoun}</span>
        <span className="body font-semibold">
          {choices.every((c) => c === ANY_STAFF) ? 'Bất kỳ ai' : 'Chọn riêng từng ' + unit}
        </span>
        <span className="body-sm text-(--ink-muted)">
          Mỗi {unit} một {staffNoun.toLowerCase()}, làm cùng lúc
        </span>
      </span>
      <Button variant="ghost" size="sm" onClick={() => setPerServiceOpen(true)}>
        Đổi
      </Button>
    </div>
  );
  const perServiceSheet = (chain || group) && (
    <PerServiceStaff
      open={perServiceOpen}
      title={group ? `${staffNoun} cho từng ${unit}` : `${staffNoun} cho từng dịch vụ`}
      note={
        group
          ? `Mỗi ${unit} một ${staffNoun.toLowerCase()} khác nhau. Chọn trùng người thì không có giờ cùng lúc.`
          : 'Chọn người riêng thì giờ trống ít hơn, vì mỗi người phải rảnh đúng lúc dịch vụ của mình bắt đầu.'
      }
      onClose={() => setPerServiceOpen(false)}
      onApply={applyPerService}
      rows={items.map((it, i) => ({
        id: it.key,
        label: `${i + 1}. ${itemTitle(it)}`,
        value: choices[i] ?? ANY_STAFF,
        ...(i === 0 ? { help: 'Chọn đích danh thì giá theo cấp của người đó.' } : {}),
        options: [
          {
            value: ANY_STAFF,
            label: `Bất kỳ ai · ${formatVnd(priceOf(it.variant, it.service.id))}`,
          },
          ...staff
            .filter((m) => m.profile.bookableOnline && m.skillServiceIds.includes(it.service.id))
            .map((m) => ({
              value: m.resourceId,
              label: `${m.profile.displayName} · ${formatVnd(priceOf(it.variant, it.service.id, m.resourceId))}`,
            })),
        ],
      }))}
    />
  );

  let title = '';
  let body: ReactNode = null;
  let cta: Cta | null = null;

  if (step === 'service' && people) {
    title = 'Đi mấy người?';
    body = (
      <div className="sp-stack">
        <p className="body-sm m-0 text-(--ink-muted)">
          Đặt chung cho bạn và người đi cùng, tối đa {MAX_PARTY} người.
        </p>
        <div className="flex items-center justify-between rounded-(--radius-lg) bg-(--surface-raised) px-(--space-4) py-(--space-3) shadow-[0_0_0_1px_var(--line)]">
          <label htmlFor="party-size" className="body font-medium">
            Số người
          </label>
          <QuantityInput
            id="party-size"
            noun="người"
            value={people.length}
            min={2}
            max={MAX_PARTY}
            onChange={setPartySize}
          />
        </div>
        {people.map((person, i) => {
          const sv = services.find((x) => x.id === person.pick?.serviceId);
          const v = sv?.variants.find((x) => x.id === person.pick?.variantId);
          const open = changing.includes(person.id) || !sv || !v;
          return (
            <div key={person.id} className="sp-service gap-(--space-3) p-(--space-4)">
              <span className="sp-service__name">{i === 0 ? 'Bạn' : `Người thứ ${i + 1}`}</span>
              {i > 0 && (
                <Field
                  id={`person-${person.id}`}
                  size="md"
                  label="Tên người đi cùng"
                  help="Để thợ gọi tên. Không cần số điện thoại."
                >
                  <input
                    id={`person-${person.id}`}
                    autoComplete="off"
                    value={person.name}
                    onChange={(e) => patchPerson(person.id, { name: e.target.value })}
                  />
                </Field>
              )}
              {open ? (
                services.map((svc) => (
                  <ServiceVariantList
                    key={svc.id}
                    groupName={`person-${person.id}`}
                    name={svc.name}
                    selected={person.pick?.serviceId === svc.id ? person.pick.variantId : null}
                    onSelect={(vid) => pickForPerson(person.id, svc.id, vid)}
                    variants={svc.variants.map((x) => ({
                      id: x.id,
                      name: x.name,
                      meta: formatMinutes(duration(x)),
                      price: formatVnd(priceOf(x, svc.id)),
                    }))}
                  />
                ))
              ) : (
                <>
                  <div className="flex items-baseline justify-between gap-(--space-3)">
                    <span className="flex flex-col">
                      <span className="body font-medium">
                        {sv.name} · {v.name}
                      </span>
                      <span className="body-sm sp-num text-(--ink-muted)">
                        {formatMinutes(duration(v))}
                      </span>
                    </span>
                    <span className="body sp-num">{formatVnd(priceOf(v, sv.id))}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="self-start"
                    onClick={() => setChanging((c) => [...c, person.id])}
                  >
                    Đổi dịch vụ
                  </Button>
                </>
              )}
            </div>
          );
        })}
        <p className="body-sm m-0 text-(--ink-muted)">
          Mỗi người một {staffNoun.toLowerCase()}, bắt đầu cùng giờ hoặc lệch nhau không quá 60
          phút. Bạn nhận một email xác nhận cho cả nhóm.
        </p>
        <Button variant="ghost" className="self-start" onClick={endGroup}>
          Chỉ mình tôi
        </Button>
      </div>
    );
    cta = {
      title: complete ? formatVnd(anyPrice) : 'Chưa chọn đủ dịch vụ',
      subtitle: complete
        ? `${people.length} người · ${[...new Set(items.map((it) => it.service.name))].join(', ')}`
        : undefined,
      label: 'Tiếp tục',
      disabled: !complete,
      onClick: () => go('datetime'),
    };
  } else if (step === 'service') {
    title = 'Chọn dịch vụ';
    body = (
      <div className="sp-stack">
        <p className="body-sm m-0 text-(--ink-muted)">
          Chọn được nhiều dịch vụ, làm lần lượt trong một lần đến.
        </p>
        <Button variant="ghost" className="self-start" onClick={startGroup}>
          Đặt cho nhiều người
        </Button>
        {picks.length > 0 && (
          <ServiceCart
            max={MAX_CHAIN}
            items={items.map((it, i) => ({
              id: it.key,
              name: it.service.name,
              detail: `${it.variant.name} · ${formatMinutes(duration(it.variant))} · ${formatVnd(priceOf(it.variant, it.service.id, choices[i]))}`,
            }))}
            onMove={movePick}
            onRemove={removePick}
            note={
              chain
                ? `Dịch vụ sau bắt đầu ngay khi dịch vụ trước xong. Tổng ${formatMinutes(totalMinutes)}${deposit > 0n ? `, cọc ${formatVnd(deposit)}` : ''}.`
                : ''
            }
          />
        )}
        {services.map((sv) => {
          const chosen = picks.find((x) => x.serviceId === sv.id);
          const wait = sv.variants[0]?.segments.find((x) => x.kind === 'wait');
          return (
            <ServiceVariantList
              key={sv.id}
              multiple
              name={sv.name}
              selected={chosen ? [chosen.variantId] : []}
              onSelect={(id) => togglePick(sv.id, id)}
              note={
                wait
                  ? `${sv.name} có thời gian ${wait.name.toLowerCase()}; ${staffNoun.toLowerCase()} làm cho khách khác trong lúc đó.`
                  : undefined
              }
              variants={sv.variants.map((v) => {
                const [low, high] = priceRange(v, pricedStaff(sv.id));
                return {
                  id: v.id,
                  name: v.name,
                  meta: [
                    formatMinutes(duration(v)),
                    v.depositVnd ? `cọc ${formatVnd(v.depositVnd)}` : '',
                  ]
                    .filter(Boolean)
                    .join(' · '),
                  price: low === high ? formatVnd(low) : `từ ${formatVnd(low)}`,
                  disabled: !chosen && picks.length >= MAX_CHAIN,
                };
              })}
            />
          );
        })}
      </div>
    );
    cta = {
      title:
        items.length === 0
          ? 'Chưa chọn dịch vụ'
          : chain
            ? formatVnd(anyPrice)
            : serviceTitle(items[0]!),
      subtitle: chain
        ? `${items.length} dịch vụ · ${formatMinutes(totalMinutes)}`
        : items[0]
          ? formatVnd(anyPrice)
          : undefined,
      label: 'Tiếp tục',
      disabled: items.length === 0,
      onClick: () => go(steps[1]!),
    };
  }

  if (step === 'subject') {
    const factors = priceFactors(subjectSchema, services[0]!);
    title = vocabulary.subjectQuestion ?? '';
    body = (
      <div className="sp-stack">
        <p className="body-sm m-0 text-(--ink-muted)">
          Chọn nhiều {subjectNoun} để đặt chung một lần, tối đa {MAX_PARTY}.
        </p>
        <div className="flex flex-col gap-(--space-2)" role="group" aria-label={subjectNoun}>
          {saved.map((sv) => {
            const checked = chosenIds.includes(sv.id);
            return (
              <label
                key={sv.id}
                className="sp-variant"
                style={{ gridTemplateColumns: 'auto auto 1fr' }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={!checked && chosenIds.length >= MAX_PARTY}
                  onChange={() => togglePet(sv.id)}
                />
                <span className="sp-avatar sp-avatar--sm" aria-hidden="true">
                  {sv.name.charAt(0)}
                </span>
                <span className="flex flex-col">
                  <span className="sp-variant__name">{sv.name}</span>
                  <span className="sp-variant__meta">{describeSubject(subjectSchema, sv)}</span>
                </span>
              </label>
            );
          })}
          {drafts.map((d) => {
            const made = draftSubject(d);
            return (
              <div
                key={d.id}
                className="sp-stack rounded-(--radius-lg) bg-(--surface-raised) p-(--space-4) shadow-[0_0_0_1px_var(--line)]"
              >
                <SubjectFields
                  idPrefix={`subject-${d.id}`}
                  schema={subjectSchema}
                  noun={subjectNoun}
                  nameExample={vocabulary.subjectExample}
                  name={d.name}
                  values={d.values}
                  onName={(v) => patchDraft(d.id, (x) => ({ ...x, name: v }))}
                  onValue={(k, v) =>
                    patchDraft(d.id, (x) => ({ ...x, values: { ...x.values, [k]: v } }))
                  }
                  error={(k) => (d.touched.includes(k) ? checks[d.id]!.errors[k] : undefined)}
                  touch={(k) =>
                    setDrafts((cur) =>
                      cur.map((x) =>
                        x.id === d.id && !x.touched.includes(k)
                          ? { ...x, touched: [...x.touched, k] }
                          : x,
                      ),
                    )
                  }
                />
                <p className="body-sm m-0 text-(--ink-muted)" aria-live="polite">
                  {made
                    ? servicesFor(made).length > 0
                      ? `Giá của ${made.name} hiện ở mục dịch vụ bên dưới.`
                      : `Chưa có dịch vụ nào nhận ${subjectNoun} này.`
                    : `Giá theo ${factors}, hiện ngay khi nhập.`}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="self-start"
                  onClick={() => removeDraft(d.id)}
                >
                  Bỏ {subjectNoun} này
                </Button>
              </div>
            );
          })}
          <Button
            variant="ghost"
            className="h-12 justify-start"
            disabled={chosenIds.length >= MAX_PARTY}
            onClick={addDraft}
          >
            {vocabulary.addSubject}
          </Button>
        </div>
        {chosenIds.length > 0 && (
          <section aria-labelledby="per-subject" className="sp-stack">
            <h2 id="per-subject" className="heading m-0">
              Dịch vụ cho từng {subjectNoun}
            </h2>
            {chosenIds.map((id) => {
              const subject = subjectOf(id);
              if (!subject) return null;
              const current = serviceOf(subject, id);
              return (
                <ServiceVariantList
                  key={id}
                  groupName={`service-${id}`}
                  name={subject.name}
                  selected={current?.id ?? null}
                  onSelect={(serviceId) => {
                    setServiceFor((c) => ({ ...c, [id]: serviceId }));
                    reset();
                  }}
                  variants={servicesFor(subject).map((sv) => {
                    const v = sv.variants.find((x) => matches(x, subject))!;
                    return {
                      id: sv.id,
                      name: sv.name,
                      meta: `${v.name} · ${formatMinutes(duration(v))}`,
                      price: formatVnd(priceOf(v, sv.id)),
                    };
                  })}
                />
              );
            })}
            <p className="body-sm m-0 text-(--ink-muted)">
              Giá theo {factors} của từng {subjectNoun}. Mỗi {subjectNoun} một dịch vụ trong lần đặt
              này.
            </p>
          </section>
        )}
      </div>
    );
    cta = {
      title: complete ? formatVnd(anyPrice) : `Chưa chọn ${subjectNoun}`,
      subtitle: complete
        ? `${items.map((it) => it.label).join(', ')} · ${[...new Set(items.map((it) => it.service.name))].join(', ')}`
        : undefined,
      label: 'Tiếp tục',
      disabled: !complete,
      onClick: () => go('datetime'),
    };
  }

  if (step === 'datetime' && items.length > 0) {
    const nextOpen = daySlots.length
      ? null
      : week.filter((d) => d > date).find((d) => slotsFor(d, choices).length > 0);
    const togetherHere = daySlots.filter((x) => partOf(x) === shownPart);
    title = 'Chọn ngày giờ';
    body = (
      <div className="flex flex-col gap-(--space-5)">
        {notice && (
          <p role="alert" className="sp-empty m-0">
            {notice}
          </p>
        )}
        <div className="min-[900px]:hidden">{summary}</div>
        {group ? (
          <div className="min-[900px]:hidden">{groupStaffCard}</div>
        ) : (
          <>
            <div className="min-[900px]:hidden">
              <StaffPicker
                {...staffPickerProps}
                mixed={staffChoice === MIXED ? { title: 'Theo từng dịch vụ' } : undefined}
                context={`${staffNoun} làm được ${items.map((it) => it.service.name).join(', ')} · ${formatDay(date)}`}
              />
            </div>
            <div className="flex flex-col min-[900px]:hidden">{perServiceLink}</div>
          </>
        )}
        <div className="flex flex-col gap-(--space-2)">
          <span className="label text-(--ink-muted)">Tháng {Number(date.slice(5, 7))}</span>
          <DateStrip
            dates={week.map((d) => ({ date: d, closed: !openingHours(fixture, d) }))}
            selected={date}
            onSelect={(d) => {
              setDate(d);
              setSlot(null);
              setPart(null);
            }}
          />
        </div>
        {Object.values(partCounts).some((n) => n > 0) && (
          <SegmentedTabs
            label="Buổi"
            size="lg"
            block
            controls="booking-slots"
            value={shownPart}
            onChange={(v) => setPart(v as Part)}
            items={PARTS.map((p) => ({
              value: p.value,
              label: p.label,
              count: partCounts[p.value],
              disabled: partCounts[p.value] === 0,
            }))}
          />
        )}
        <div id="booking-slots" role="tabpanel" className="flex flex-col gap-(--space-4)">
          {(!group || togetherHere.length > 0 || partCounts[shownPart] === 0) && (
            <SlotGrid
              groups={[
                {
                  label: group
                    ? `${items.length} ${unit} cùng giờ`
                    : `Buổi ${PARTS.find((x) => x.value === shownPart)?.label.toLowerCase()}`,
                  slots: togetherHere.map((x) => ({
                    value: x.startAt,
                    label: formatTime(x.startAt),
                  })),
                },
              ]}
              selected={slot && !slot.staggered ? slot.startAt : null}
              onSelect={pickSlot}
              emptyMessage={
                nextOpen
                  ? `Hết giờ trống ngày này. Ngày gần nhất còn trống: ${formatDay(nextOpen)}.`
                  : 'Hết giờ trống trong 7 ngày tới. Chọn người khác?'
              }
            />
          )}
          {group && staggeredIn(shownPart).length > 0 && (
            <section className="flex flex-col gap-(--space-2)" aria-labelledby="staggered-title">
              <h2 id="staggered-title" className="body m-0 font-semibold">
                Giờ lệch nhau
              </h2>
              <p className="body-sm m-0 text-(--ink-muted)">
                {togetherHere.length > 0
                  ? 'Hoặc để mỗi'
                  : `Không đủ chỗ cho ${items.length} ${unit} cùng lúc buổi này. Mỗi`}{' '}
                {unit} bắt đầu một lúc, cách nhau không quá 60 phút.
              </p>
              <div
                className="flex flex-col gap-(--space-2)"
                role="radiogroup"
                aria-label="Giờ lệch nhau"
              >
                {staggeredIn(shownPart).map((x) => (
                  <label key={slotKey(x)} className="sp-variant">
                    <input
                      type="radio"
                      name="combo"
                      checked={slot ? slotKey(slot) === slotKey(x) : false}
                      onChange={() => pickBookingSlot(x)}
                    />
                    <span className="flex flex-col">
                      <span className="sp-variant__name sp-num">{comboLabel(x)}</span>
                      <span className="sp-variant__meta sp-num">
                        Xong lúc {formatTime(x.endAt)}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </section>
          )}
        </div>
        {plan}
        <p className="body-sm m-0 text-(--ink-muted)">
          {items.some((it) => it.variant.segments.some((x) => x.kind === 'wait')) &&
            'Thời lượng đã gồm thời gian chờ. '}
          Giờ theo giờ Việt Nam.
        </p>
        {perServiceSheet}
      </div>
    );
    cta = {
      title: !slot
        ? 'Chưa chọn giờ'
        : chain || group
          ? `${formatVnd(price)}${deposit > 0n ? ` · cọc ${formatVnd(deposit)}` : ''}`
          : slotLine,
      subtitle: slot
        ? group
          ? slotLine
          : chain
            ? `${slotLine} · ${peopleNames}`
            : choices.includes(ANY_STAFF)
              ? `${staffNoun} được xếp tự động`
              : peopleNames
        : undefined,
      label: 'Tiếp tục',
      disabled: !slot,
      onClick: () => go('info'),
    };
  }

  if (step === 'info') {
    title = 'Thông tin liên hệ';
    body = (
      <div className="sp-stack">
        {hold}
        <Field id="booking-name" label="Họ và tên">
          <input
            id="booking-name"
            autoComplete="name"
            placeholder="Ví dụ: Nguyễn Minh Thư"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <PhoneField
          id="booking-phone"
          label="Số điện thoại"
          value={phone}
          onChange={setPhone}
          onBlur={() => setPhoneTouched(true)}
          error={phoneError}
          help={`Để ${tenant.name} liên hệ khi cần.`}
        />
        <Field
          id="booking-email"
          label="Email"
          error={emailError}
          help="Mã xác nhận gửi tới email này."
        >
          <input
            id="booking-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="Ví dụ: thu@example.com"
            value={email}
            aria-invalid={emailError ? true : undefined}
            aria-describedby="booking-email-help"
            onChange={(e) => {
              setEmail(e.target.value);
              setOtpSent(false);
              setOtp('');
            }}
            onBlur={() => setEmailTouched(true)}
          />
        </Field>
        {otpSent ? (
          <OtpField
            id="booking-otp"
            value={otp}
            onChange={setOtp}
            help={`Đã gửi mã 6 số tới ${email.trim()}.`}
          />
        ) : (
          <div>
            <Button
              disabled={!isEmail(email)}
              onClick={() => {
                setEmailTouched(true);
                setOtpSent(true);
              }}
            >
              Gửi mã
            </Button>
          </div>
        )}
      </div>
    );
    cta = {
      title: slotLine,
      subtitle: assignedStaff,
      label: 'Tiếp tục',
      disabled: !infoReady,
      onClick: () => go('confirm'),
    };
  }

  if (step === 'confirm' && items.length > 0 && variant && slot) {
    title = confirmed ? 'Đã đặt lịch' : 'Xác nhận';
    const contact: [string, string] = [
      'Liên hệ',
      `${name} · ${phoneE164 ? formatPhone(phoneE164) : ''} · ${email.trim()}`,
    ];
    const rows: [string, string][] =
      chain || group
        ? [
            contact,
            ['Giá', formatVnd(price)],
            ...(deposit > 0n ? [['Đặt cọc', formatVnd(deposit)] as [string, string]] : []),
          ]
        : [
            ['Dịch vụ', serviceTitle(items[0]!)],
            ...(items[0]!.label ? [['Cho', items[0]!.label] as [string, string]] : []),
            ['Thời gian', `${slotLine} · ${formatMinutes(duration(variant))}`],
            [staffNoun, assignedStaff],
            contact,
            ['Giá', formatVnd(price)],
            ...(deposit > 0n ? [['Đặt cọc', formatVnd(deposit)] as [string, string]] : []),
          ];
    const end = slot.endAt;
    body = (
      <div className="sp-stack">
        {hold}
        {confirmed && (
          <div className="sp-row">
            <StatusBadge status="confirmed" />
            <span className="body-sm text-(--ink-muted)">
              Đã gửi email xác nhận tới {email.trim()}.
            </span>
          </div>
        )}
        {plan}
        <dl className="m-0 flex flex-col rounded-(--radius-lg) bg-(--surface-raised) px-(--space-4) shadow-[0_0_0_1px_var(--line)]">
          {rows.map(([k, v]) => (
            <div
              key={k}
              className="flex justify-between gap-(--space-4) border-b border-(--line) py-(--space-3) last:border-b-0"
            >
              <dt className="body-sm flex-none whitespace-nowrap text-(--ink-muted)">{k}</dt>
              <dd className="body sp-num m-0 min-w-0 text-right break-words">{v}</dd>
            </div>
          ))}
        </dl>
        {deposit > 0n && !confirmed && (
          <p className="body-sm m-0 text-(--ink-muted)">
            Đặt cọc {formatVnd(deposit)} để giữ lịch, trừ vào tiền dịch vụ. Hủy miễn phí trước 24
            giờ.
          </p>
        )}
        {confirmed && (
          <div className="flex flex-col gap-(--space-2)">
            <Button
              size="lg"
              block
              onClick={() =>
                downloadIcs({
                  start: slot.startAt,
                  end,
                  title: `${items.map((it) => it.service.name).join(', ')} · ${tenant.name}`,
                  location: branch.address,
                })
              }
            >
              Thêm vào lịch điện thoại
            </Button>
            <Button
              size="lg"
              block
              onClick={() => toast({ text: 'Xem lịch hẹn của bạn: chưa có trong mock.' })}
            >
              Xem lịch hẹn của bạn
            </Button>
            <Button
              variant="ghost"
              size="lg"
              block
              onClick={() => toast({ text: `Trang ${tenant.name}: chưa có trong mock.` })}
            >
              Về trang {tenant.name}
            </Button>
          </div>
        )}
      </div>
    );
    cta = confirmed
      ? null
      : {
          title: deposit > 0n ? `Cọc ${formatVnd(deposit)}` : formatVnd(price),
          subtitle: slotLine,
          label: 'Xác nhận đặt lịch',
          disabled: !bookingOpen,
          onClick: confirmBooking,
        };
  }

  const ctaButton = (c: Cta, block = false) => (
    <Button variant="accent" size="lg" block={block} disabled={c.disabled} onClick={c.onClick}>
      {c.label}
    </Button>
  );
  const progress = (
    <>
      {steps.map((s, i) => (
        <div
          key={s}
          className={cn(
            'h-1 rounded-(--radius-pill)',
            i <= stepIndex ? 'bg-(--accent)' : 'bg-(--fill-tonal)',
          )}
        />
      ))}
    </>
  );

  return (
    <div
      className={cn(
        `sp-tenant-${tenant.id}`,
        'mx-auto flex w-full max-w-[560px] flex-col gap-(--space-5) pb-32 min-[900px]:max-w-[1040px] min-[900px]:pb-0',
      )}
    >
      <div className="flex min-h-11 items-center gap-(--space-2)">
        {!confirmed && (
          <Button
            variant="ghost"
            aria-label="Quay lại"
            className="size-11! rounded-(--radius-pill)! p-0!"
            disabled={stepIndex === 0}
            onClick={back}
          >
            <ArrowLeft size={20} aria-hidden="true" />
          </Button>
        )}
        <div className="flex grow flex-col min-[900px]:hidden">
          <span className="body font-semibold">{tenant.name}</span>
          <span className="body-sm text-(--ink-muted)">{branch.name}</span>
        </div>
        {!confirmed && (
          <div className="body-sm sp-num ms-auto flex items-center gap-(--space-3) text-(--ink-muted)">
            <span>
              Bước {stepIndex + 1}/{steps.length}
            </span>
            <div
              className="hidden w-40 grid-cols-[repeat(var(--n),minmax(0,1fr))] gap-(--space-1) min-[900px]:grid"
              style={{ ['--n' as string]: steps.length }}
              aria-hidden="true"
            >
              {progress}
            </div>
          </div>
        )}
      </div>
      {!confirmed && (
        <div
          className="grid grid-cols-[repeat(var(--n),minmax(0,1fr))] gap-(--space-1) min-[900px]:hidden"
          style={{ ['--n' as string]: steps.length }}
          aria-hidden="true"
        >
          {progress}
        </div>
      )}

      <div className="min-[900px]:flex min-[900px]:items-start min-[900px]:rounded-(--radius-lg) min-[900px]:bg-(--surface-raised) min-[900px]:shadow-[0_0_0_1px_var(--line),var(--shadow-card)]">
        {/* Sticky so the main button stays on screen at 1280×800. */}
        <section
          aria-label="Tóm tắt"
          className="hidden w-[360px] flex-none flex-col gap-(--space-4) p-(--space-5) shadow-[1px_0_0_var(--line)] min-[900px]:sticky min-[900px]:top-20 min-[900px]:flex"
        >
          <div className="flex flex-col gap-0.5">
            <span className="heading">{tenant.name}</span>
            <span className="body-sm text-(--ink-muted)">{branch.address}</span>
          </div>
          {summary}
          {step === 'datetime' && group && groupStaffCard}
          {step === 'datetime' && items.length > 0 && !group && (
            <div className="flex flex-col gap-(--space-2)">
              <span className="label text-(--ink-muted)">{staffNoun}</span>
              <StaffOptionList compact {...staffPickerProps} />
              {staffChoice === MIXED && (
                <span className="body-sm text-(--ink-muted)">Đang chọn theo từng dịch vụ.</span>
              )}
              {perServiceLink}
            </div>
          )}
          {step !== 'datetime' && slot && (
            <div className="flex flex-col gap-0.5">
              <span className="label text-(--ink-muted)">Thời gian</span>
              <span className="body sp-num">{slotLine}</span>
              <span className="body-sm text-(--ink-muted)">
                {chain || group ? peopleNames : assignedStaff}
              </span>
            </div>
          )}
          {cta && (
            <div className="flex flex-col gap-(--space-3) border-t border-(--line) pt-(--space-4)">
              <div className="flex flex-col">
                <span className="body sp-num font-semibold">{cta.title}</span>
                {cta.subtitle && <span className="body-sm text-(--ink-muted)">{cta.subtitle}</span>}
              </div>
              {ctaButton(cta, true)}
            </div>
          )}
          <p className="body-sm m-0 text-(--ink-muted)">
            Hủy miễn phí trước 24 giờ. Giờ theo giờ Việt Nam.
          </p>
        </section>
        <section
          aria-labelledby="booking-step-title"
          className="flex min-w-0 flex-[999_1_480px] flex-col gap-(--space-5) min-[900px]:p-(--space-6)"
        >
          <h1 id="booking-step-title" className="title m-0">
            {title}
          </h1>
          {body}
          {cta && (
            <div className="min-[900px]:hidden">
              <BottomBar title={cta.title} subtitle={cta.subtitle} action={ctaButton(cta)} />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
