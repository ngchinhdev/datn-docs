'use client';

import { ArrowLeft } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useCallback, useMemo, useState, type ReactNode } from 'react';
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
import { useMockNow } from '@/components/sapio/use-mock-now';
import { cn } from '@/lib/utils';
import { freeChainSlots, type FreeChainSlot } from '@/mock/availability';
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
const RELEASED = 'Chỗ đã được trả lại. Chọn giờ khác.';
const NEW_SUBJECT = 'new';
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
interface ChainPick {
  serviceId: string;
  variantId: string;
}
interface ChainItem {
  service: Service;
  variant: ServiceVariant;
}
const partOf = (slot: FreeChainSlot) => {
  const hour = Number(formatTime(slot.startAt).slice(0, 2));
  return PARTS.find((p) => hour >= p.from && hour < p.to)?.value ?? 'evening';
};
const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());

const icsStamp = (iso: string) => iso.replace(/[-:]/g, '').replace(/\.\d{3}/, '');

function downloadIcs(o: { start: string; end: string; title: string; location: string }) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Sapio mock//VI',
    'BEGIN:VEVENT',
    `UID:${icsStamp(o.start)}@sapio.mock`,
    `DTSTAMP:${icsStamp(new Date(MOCK_NOW).toISOString())}`,
    `DTSTART:${icsStamp(o.start)}`,
    `DTEND:${icsStamp(o.end)}`,
    `SUMMARY:${o.title}`,
    `LOCATION:${o.location.replace(/,/g, '\\,')}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  const url = URL.createObjectURL(new Blob([lines.join('\r\n')], { type: 'text/calendar' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'lich-hen.ics';
  a.click();
  URL.revokeObjectURL(url);
}

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
    ? ['service', 'subject', 'datetime', 'info', 'confirm']
    : ['service', 'datetime', 'info', 'confirm'];

  const now = useMockNow();
  const today = localDate(MOCK_NOW);
  const [stepParam, setStepParam] = useQueryState('step', 'service');
  const preset = useSearchParams().get('service');
  const presetService = services.find((s) => s.id === preset);
  const [serviceId, setServiceId] = useState<string | null>(presetService?.id ?? null);
  // Industries without a served subject build a chain of up to four services (BR-18).
  const [picks, setPicks] = useState<ChainPick[]>(
    !asksSubject && presetService && presetService.variants[0]
      ? [{ serviceId: presetService.id, variantId: presetService.variants[0].id }]
      : [],
  );
  const [staffByService, setStaffByService] = useState<Record<string, string>>({});
  const [perServiceOpen, setPerServiceOpen] = useState(false);
  const [subjectId, setSubjectId] = useState<string | null>(newCustomer ? NEW_SUBJECT : null);
  const [newName, setNewName] = useState('');
  const [newValues, setNewValues] = useState<SubjectValues>({});
  const [subjectTouched, setSubjectTouched] = useState<Set<string>>(new Set());
  const [date, setDate] = useState(today);
  const [part, setPart] = useState<Part | null>(null);
  const [slot, setSlot] = useState<FreeChainSlot | null>(null);
  const [holdExpiresAt, setHoldExpiresAt] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [email, setEmail] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  const service = services.find((s) => s.id === serviceId) ?? null;
  // BR-71: the new subject only exists once its values follow the schema of the industry.
  const subjectCheck = checkSubject(subjectSchema, subjectNoun, newName, newValues);
  const newSubject: ServedSubject | null =
    Object.keys(subjectCheck.errors).length === 0
      ? {
          id: NEW_SUBJECT,
          tenantId: tenant.id,
          customerId: '',
          kind: 'other',
          name: newName.trim(),
          attributes: subjectCheck.attributes,
        }
      : null;
  const subject =
    subjectId === NEW_SUBJECT ? newSubject : (saved.find((s) => s.id === subjectId) ?? null);
  // BR-13: when a served subject is asked for, the variant follows its attributes.
  const subjectVariant =
    (asksSubject && subject && service?.variants.find((v) => matches(v, subject))) || null;
  const items: ChainItem[] = useMemo(() => {
    if (asksSubject) return service && subjectVariant ? [{ service, variant: subjectVariant }] : [];
    return picks.flatMap((p) => {
      const sv = services.find((x) => x.id === p.serviceId);
      const v = sv?.variants.find((x) => x.id === p.variantId);
      return sv && v ? [{ service: sv, variant: v }] : [];
    });
  }, [asksSubject, service, subjectVariant, picks, services]);
  const variant = items[0]?.variant ?? null;
  const chain = items.length > 1;
  const choices = items.map((it) => staffByService[it.service.id] ?? ANY_STAFF);
  const choiceKey = choices.join('|');
  /** One value when everyone asked for is the same, else `MIXED`. */
  const staffChoice = choices.every((c) => c === choices[0]) ? (choices[0] ?? ANY_STAFF) : MIXED;
  // `?step=` is the source; a link to a step whose choices are missing falls back to the first step.
  const reachable: Record<Step, boolean> = {
    service: true,
    subject: Boolean(service),
    datetime: items.length > 0,
    info: Boolean(slot),
    confirm: Boolean(slot),
  };
  const requested = steps.find((s) => s === stepParam);
  const step: Step = requested && reachable[requested] ? requested : 'service';
  const stepIndex = steps.indexOf(step);
  const staffName = (id: string) => resources.find((r) => r.id === id)?.name ?? '';
  const sum = (xs: bigint[]) => xs.reduce((a, b) => a + b, 0n);
  /** BR-18, BR-56: the price and the deposit are the sums of the items. */
  const price = sum(items.map((it, i) => priceOf(it.variant, it.service.id, choices[i])));
  const anyPrice = sum(items.map((it) => priceOf(it.variant, it.service.id)));
  const deposit = sum(items.map((it) => it.variant.depositVnd ?? 0n));
  const totalMinutes = items.reduce((m, it) => m + duration(it.variant), 0);

  const week = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(today, i)), [today]);
  const slotsFor = useCallback(
    (day: string, who: readonly string[]) =>
      items.length > 0
        ? freeChainSlots({
            fixture,
            date: day,
            notBefore: MOCK_NOW,
            items: items.map((it, i) => ({
              variant: it.variant,
              serviceId: it.service.id,
              staffResourceId: who[i] ?? ANY_STAFF,
            })),
          })
        : [],
    [fixture, items],
  );
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `choiceKey` stands for `choices`
  const daySlots = useMemo(() => slotsFor(date, choices), [slotsFor, date, choiceKey]);
  const partCounts = Object.fromEntries(
    PARTS.map((p) => [p.value, daySlots.filter((s) => partOf(s) === p.value).length]),
  ) as Record<Part, number>;
  // D-14: default to the earliest part of day that still has slots.
  const firstPart = PARTS.find((p) => partCounts[p.value] > 0)?.value ?? 'morning';
  const shownPart = part && partCounts[part] > 0 ? part : firstPart;

  // BR-14: only online-bookable staff who can do the service.
  const staffOptions: StaffOption[] = useMemo(
    () =>
      staff
        .filter(
          (s) =>
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
    [staff, items, slotsFor, date, week],
  );

  const releaseHold = useCallback(() => {
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

  function pickSlot(startAt: string) {
    const found = daySlots.find((s) => s.startAt === startAt) ?? null;
    setSlot(found);
    // BR-07: choosing a time starts a 10-minute hold.
    setHoldExpiresAt(found && bookingOpen ? addMinutes(now, HOLD_MINUTES) : null);
    setNotice(null);
  }
  const reset = () => {
    setSlot(null);
    setHoldExpiresAt(null);
    setPart(null);
  };
  /** One person for the whole chain. */
  function chooseStaff(v: string) {
    setStaffByService(Object.fromEntries(items.map((it) => [it.service.id, v])));
    reset();
  }
  function applyPerService(values: Record<string, string>) {
    setStaffByService(values);
    reset();
  }
  /** Adding a variant of a service already in the chain replaces it; the limit is BR-18. */
  function togglePick(serviceId: string, variantId: string) {
    setPicks((current) => {
      const same = current.find((p) => p.serviceId === serviceId);
      if (same?.variantId === variantId) return current.filter((p) => p !== same);
      if (same) return current.map((p) => (p === same ? { serviceId, variantId } : p));
      return current.length >= MAX_CHAIN ? current : [...current, { serviceId, variantId }];
    });
    reset();
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

  const phoneE164 = normalizePhone(phone);
  const phoneError =
    phoneTouched && !phoneE164 ? 'Số điện thoại chưa đúng. Ví dụ: 0912 345 678.' : null;
  const emailError =
    emailTouched && !isEmail(email) ? 'Email chưa đúng. Ví dụ: thu@example.com.' : null;
  const infoReady =
    name.trim().length > 0 && Boolean(phoneE164) && isEmail(email) && /^\d{6}$/.test(otp);

  const slotLine = slot
    ? `${formatTime(slot.startAt)}${chain ? `–${formatTime(slot.endAt)}` : ''} · ${formatDay(localDate(slot.startAt))}`
    : '';
  const peopleNames = slot
    ? [...new Set(slot.items.map((it) => staffName(it.staffResourceId)))].join(', ')
    : '';
  const assignedStaff = slot
    ? choices.includes(ANY_STAFF)
      ? `${peopleNames}, xếp tự động`
      : peopleNames
    : '';
  const itemTitle = (it: ChainItem) => `${it.service.name} · ${it.variant.name}`;

  /** "Lịch của bạn" (MH-13): the time, the person and the waits of each item. */
  const planItems: PlanItem[] = slot
    ? slot.items.map((placed, i) => {
        const it = items[i]!;
        const previous = slot.items[i - 1];
        const gap = previous
          ? (Date.parse(placed.startAt) - Date.parse(previous.endAt)) / 60_000
          : 0;
        const segment = (kind: 'prep' | 'wait') => it.variant.segments.find((x) => x.kind === kind);
        const wait = it.variant.segments
          .filter((x) => x.kind === 'wait')
          .reduce((m, x) => m + x.endMinute - x.startMinute, 0);
        return {
          id: it.service.id,
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
  const plan = slot && chain && (
    <ChainPlan
      heading={`Lịch của bạn, ${formatDay(localDate(slot.startAt))}`}
      items={planItems}
      footer={`Xong khoảng ${formatTime(slot.endAt)}.`}
    />
  );

  const summary = items.length > 0 && (
    <div className="flex flex-col gap-(--space-2) rounded-(--radius-md) bg-(--fill-tonal) p-(--space-4)">
      {items.map((it, i) => (
        <div key={it.service.id} className="flex items-start justify-between gap-(--space-2)">
          <div className="flex min-w-0 flex-col gap-(--space-1)">
            <span className="body font-semibold">{itemTitle(it)}</span>
            <span className="body-sm sp-num text-(--ink-muted)">
              {formatMinutes(duration(it.variant))} ·{' '}
              {formatVnd(priceOf(it.variant, it.service.id, choices[i]))}
            </span>
          </div>
          {i === 0 && step !== 'service' && !confirmed && (
            <Button variant="ghost" size="sm" onClick={() => go('service')}>
              Đổi
            </Button>
          )}
        </div>
      ))}
      {chain && (
        <span className="body-sm sp-num border-t border-(--line) pt-(--space-2) text-(--ink-muted)">
          Tổng {formatMinutes(totalMinutes)} · {formatVnd(price)}
          {deposit > 0n && ` · cọc ${formatVnd(deposit)}`}
        </span>
      )}
      {subject && <span className="body-sm text-(--ink-muted)">Cho {subject.name}</span>}
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
  const perServiceSheet = chain && (
    <PerServiceStaff
      open={perServiceOpen}
      title={`${staffNoun} cho từng dịch vụ`}
      note={`Chọn người riêng thì giờ trống ít hơn, vì mỗi người phải rảnh đúng lúc dịch vụ của mình bắt đầu.`}
      onClose={() => setPerServiceOpen(false)}
      onApply={applyPerService}
      rows={items.map((it, i) => ({
        id: it.service.id,
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

  if (step === 'service') {
    title = 'Chọn dịch vụ';
    body = asksSubject ? (
      <ServiceVariantList
        name="Dịch vụ"
        selected={serviceId}
        onSelect={(id) => {
          setServiceId(id);
          setSlot(null);
        }}
        variants={services.map((s) => {
          const min = s.variants.reduce(
            (m, v) => (v.priceVnd < m ? v.priceVnd : m),
            s.variants[0]!.priceVnd,
          );
          return {
            id: s.id,
            name: s.name,
            meta: `Giá theo ${priceFactors(subjectSchema, s)}`,
            price: `từ ${formatVnd(min)}`,
          };
        })}
      />
    ) : (
      <div className="sp-stack">
        <p className="body-sm m-0 text-(--ink-muted)">
          Chọn được nhiều dịch vụ, làm lần lượt trong một lần đến.
        </p>
        {picks.length > 0 && (
          <ServiceCart
            max={MAX_CHAIN}
            items={items.map((it, i) => ({
              id: it.service.id,
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
        {services.map((s) => {
          const chosen = picks.find((x) => x.serviceId === s.id);
          const wait = s.variants[0]?.segments.find((x) => x.kind === 'wait');
          return (
            <ServiceVariantList
              key={s.id}
              multiple
              name={s.name}
              selected={chosen ? [chosen.variantId] : []}
              onSelect={(id) => togglePick(s.id, id)}
              note={
                wait
                  ? `${s.name} có thời gian ${wait.name.toLowerCase()}; ${staffNoun.toLowerCase()} làm cho khách khác trong lúc đó.`
                  : undefined
              }
              variants={s.variants.map((v) => {
                const [low, high] = priceRange(v, pricedStaff(s.id));
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
      title: asksSubject
        ? service
          ? service.name
          : 'Chưa chọn dịch vụ'
        : items.length === 0
          ? 'Chưa chọn dịch vụ'
          : chain
            ? formatVnd(anyPrice)
            : itemTitle(items[0]!),
      subtitle: asksSubject
        ? undefined
        : chain
          ? `${items.length} dịch vụ · ${formatMinutes(totalMinutes)}`
          : items[0]
            ? formatVnd(anyPrice)
            : undefined,
      label: 'Tiếp tục',
      disabled: asksSubject ? !service : items.length === 0,
      onClick: () => go(steps[1]!),
    };
  }

  if (step === 'subject' && service) {
    const options = saved.filter((s) => service.variants.some((v) => matches(v, s)));
    const newVariant = newSubject && service.variants.find((v) => matches(v, newSubject));
    const factors = priceFactors(subjectSchema, service);
    const touch = (key: string) => setSubjectTouched((t) => new Set(t).add(key));
    const error = (key: string) => (subjectTouched.has(key) ? subjectCheck.errors[key] : undefined);
    const setValue = (key: string, value: string) => setNewValues((v) => ({ ...v, [key]: value }));
    title = vocabulary.subjectQuestion ?? '';
    body = (
      <div className="sp-stack">
        <ServiceVariantList
          name={service.name}
          selected={subjectId}
          onSelect={(id) => {
            setSubjectId(id);
            setSlot(null);
          }}
          variants={[
            ...options.map((s) => {
              const v = service.variants.find((x) => matches(x, s))!;
              return {
                id: s.id,
                name: s.name,
                meta: `${describeSubject(subjectSchema, s)} · ${v.name} · ${formatMinutes(duration(v))}`,
                price: formatVnd(priceOf(v, service.id)),
              };
            }),
            {
              id: NEW_SUBJECT,
              name: vocabulary.addSubject ?? '',
              meta: newVariant
                ? `${newSubject.name} · ${newVariant.name} · ${formatMinutes(duration(newVariant))}`
                : askedFields(fixture),
              price: newVariant ? formatVnd(priceOf(newVariant, service.id)) : '',
            },
          ]}
        />
        {subjectId === NEW_SUBJECT && (
          <div className="sp-stack rounded-(--radius-lg) bg-(--surface-raised) p-(--space-4) shadow-[0_0_0_1px_var(--line)]">
            <SubjectFields
              idPrefix="subject"
              schema={subjectSchema}
              noun={subjectNoun}
              nameExample={vocabulary.subjectExample}
              name={newName}
              values={newValues}
              onName={setNewName}
              onValue={setValue}
              error={error}
              touch={touch}
            />
            <p className="body-sm m-0 text-(--ink-muted)" aria-live="polite">
              {newSubject
                ? newVariant
                  ? `Giá cho ${newSubject.name}: ${newVariant.name}, ${formatVnd(priceOf(newVariant, service.id))}.`
                  : `${service.name} chưa nhận ${subjectNoun} này. Chọn dịch vụ khác.`
                : `Giá theo ${factors}, hiện ngay khi nhập.`}
            </p>
          </div>
        )}
        {subject && subjectId !== NEW_SUBJECT && (
          <p className="body-sm m-0 text-(--ink-muted)">
            Giá theo {factors} của {subject.name}.
          </p>
        )}
      </div>
    );
    cta = {
      title: subject && variant ? `${subject.name} · ${service.name}` : `Chưa chọn ${subjectNoun}`,
      subtitle: variant ? formatVnd(price) : undefined,
      label: 'Tiếp tục',
      disabled: !variant,
      onClick: () => go('datetime'),
    };
  }

  if (step === 'datetime' && items.length > 0) {
    const nextOpen = daySlots.length
      ? null
      : week.filter((d) => d > date).find((d) => slotsFor(d, choices).length > 0);
    title = 'Chọn ngày giờ';
    body = (
      <div className="flex flex-col gap-(--space-5)">
        {notice && (
          <p role="alert" className="sp-empty m-0">
            {notice}
          </p>
        )}
        <div className="min-[900px]:hidden">{summary}</div>
        <div className="min-[900px]:hidden">
          <StaffPicker
            {...staffPickerProps}
            mixed={staffChoice === MIXED ? { title: 'Theo từng dịch vụ' } : undefined}
            context={`${staffNoun} làm được ${items.map((it) => it.service.name).join(', ')} · ${formatDay(date)}`}
          />
        </div>
        <div className="flex flex-col min-[900px]:hidden">{perServiceLink}</div>
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
        {daySlots.length > 0 && (
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
        <div id="booking-slots" role="tabpanel">
          <SlotGrid
            groups={[
              {
                label: `Buổi ${PARTS.find((p) => p.value === shownPart)?.label.toLowerCase()}`,
                slots: daySlots
                  .filter((s) => partOf(s) === shownPart)
                  .map((s) => ({ value: s.startAt, label: formatTime(s.startAt) })),
              },
            ]}
            selected={slot?.startAt ?? null}
            onSelect={pickSlot}
            emptyMessage={
              nextOpen
                ? `Hết giờ trống ngày này. Ngày gần nhất còn trống: ${formatDay(nextOpen)}.`
                : 'Hết giờ trống trong 7 ngày tới. Chọn người khác?'
            }
          />
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
        : chain
          ? `${formatVnd(price)}${deposit > 0n ? ` · cọc ${formatVnd(deposit)}` : ''}`
          : slotLine,
      subtitle: slot
        ? chain
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
    const rows: [string, string][] = chain
      ? [
          contact,
          ['Giá', formatVnd(price)],
          ...(deposit > 0n ? [['Đặt cọc', formatVnd(deposit)] as [string, string]] : []),
        ]
      : [
          ['Dịch vụ', itemTitle(items[0]!)],
          ...(subject ? [['Cho', subject.name] as [string, string]] : []),
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
          onClick: () => setConfirmed(true),
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
          {step === 'datetime' && items.length > 0 && (
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
                {chain ? peopleNames : assignedStaff}
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
