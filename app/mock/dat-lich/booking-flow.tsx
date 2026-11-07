'use client';

import { ArrowLeft } from 'lucide-react';
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { BottomBar } from '@/components/sapio/bottom-bar';
import { Button } from '@/components/sapio/button';
import { DateStrip } from '@/components/sapio/date-strip';
import { HoldBanner } from '@/components/sapio/hold-banner';
import { PhoneField } from '@/components/sapio/phone-field';
import { SegmentedTabs } from '@/components/sapio/segmented';
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
import { freeSlots, type FreeSlot } from '@/mock/availability';
import { tenantFixtures, type ServedSubject, type ServiceVariant } from '@/mock/fixtures';
import { formatMinutes, formatPhone, formatVnd, normalizePhone } from '@/mock/format';
import { openingHours } from '@/mock/hours';
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
const RELEASED = 'Chỗ đã được trả lại. Chọn giờ khác.';
const NEW_SUBJECT = 'new';
/** A returning customer has a session, so their saved served subjects show (BR-17). */
const RETURNING_CUSTOMER: Record<string, string> = { may: 'may-c-thu', pawpaw: 'paw-c-linh' };
const PARTS: { value: Part; label: string; from: number; to: number }[] = [
  { value: 'morning', label: 'Sáng', from: 0, to: 12 },
  { value: 'afternoon', label: 'Chiều', from: 12, to: 17 },
  { value: 'evening', label: 'Tối', from: 17, to: 24 },
];
/** Above this weight a dog takes the large variant. */
const SMALL_DOG_MAX_KG = 10;

const duration = (v: ServiceVariant) => Math.max(...v.segments.map((s) => s.endMinute));
const matches = (v: ServiceVariant, subject: ServedSubject) =>
  Object.entries(v.match).every(([key, value]) => subject.attributes[key] === value);
const partOf = (slot: FreeSlot) => {
  const hour = Number(formatTime(slot.startAt).slice(0, 2));
  return PARTS.find((p) => hour >= p.from && hour < p.to)?.value ?? 'evening';
};
const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());

function subjectMeta(subject: ServedSubject) {
  const { breed, weightKg } = subject.attributes;
  return [breed, weightKg && `${weightKg} kg`].filter(Boolean).join(' · ');
}

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

function Field({
  id,
  label,
  children,
  help,
  error,
}: {
  id: string;
  label: string;
  children: ReactNode;
  help?: string | undefined;
  error?: string | null | undefined;
}) {
  const message = error ?? help;
  return (
    <div className={cn('sp-field', error && 'sp-field--error')}>
      <label className="sp-field__label" htmlFor={id}>
        {label}
      </label>
      <div className="sp-field__control">{children}</div>
      {message && (
        <span id={`${id}-help`} className="sp-field__help">
          {message}
        </span>
      )}
    </div>
  );
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
}: {
  tenantSlug: string;
  newCustomer: boolean;
}) {
  const fixture = tenantFixtures.find((f) => f.tenant.slug === tenantSlug) ?? tenantFixtures[0]!;
  const { tenant, services, staff, resources, resourceTypes } = fixture;
  const branch = fixture.branches[0]!;
  const toast = useToast();
  const staffNoun = resourceTypes.find((t) => t.isStaff)?.name ?? 'Nhân viên';
  const asksSubject = fixture.servedSubjects.some((s) => s.kind === 'other');
  const saved = newCustomer
    ? []
    : fixture.servedSubjects.filter((s) => s.customerId === RETURNING_CUSTOMER[tenant.id]);
  const steps: Step[] = asksSubject
    ? ['service', 'subject', 'datetime', 'info', 'confirm']
    : ['service', 'datetime', 'info', 'confirm'];

  const now = useMockNow();
  const today = localDate(MOCK_NOW);
  const [step, setStep] = useState<Step>('service');
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [variantId, setVariantId] = useState<string | null>(null);
  const [subjectId, setSubjectId] = useState<string | null>(newCustomer ? NEW_SUBJECT : null);
  const [petName, setPetName] = useState('');
  const [petSpecies, setPetSpecies] = useState<'dog' | 'cat' | null>(null);
  const [petWeight, setPetWeight] = useState('');
  const [date, setDate] = useState(today);
  const [part, setPart] = useState<Part | null>(null);
  const [staffChoice, setStaffChoice] = useState(ANY_STAFF);
  const [slot, setSlot] = useState<FreeSlot | null>(null);
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
  const weightKg = Number(petWeight.replace(',', '.'));
  const newSubject: ServedSubject | null =
    petName.trim() && petSpecies && (petSpecies === 'cat' || weightKg > 0)
      ? {
          id: NEW_SUBJECT,
          tenantId: tenant.id,
          customerId: '',
          kind: 'other',
          name: petName.trim(),
          attributes: {
            species: petSpecies,
            ...(petSpecies === 'dog'
              ? { size: weightKg < SMALL_DOG_MAX_KG ? 'small' : 'large' }
              : {}),
            ...(weightKg > 0 ? { weightKg: String(weightKg) } : {}),
          },
        }
      : null;
  const subject =
    subjectId === NEW_SUBJECT ? newSubject : (saved.find((s) => s.id === subjectId) ?? null);
  // BR-13: when a served subject is asked for, the variant follows its attributes.
  const variant = asksSubject
    ? ((subject && service?.variants.find((v) => matches(v, subject))) ?? null)
    : (service?.variants.find((v) => v.id === variantId) ?? null);
  const stepIndex = steps.indexOf(step);
  const staffName = (id: string) => resources.find((r) => r.id === id)?.name ?? '';

  const week = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(today, i)), [today]);
  const slotsFor = useCallback(
    (day: string, staffId: string) =>
      variant && service
        ? freeSlots({
            fixture,
            variant,
            serviceId: service.id,
            date: day,
            staffResourceId: staffId,
            notBefore: MOCK_NOW,
          })
        : [],
    [fixture, variant, service],
  );
  const daySlots = useMemo(() => slotsFor(date, staffChoice), [slotsFor, date, staffChoice]);
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
          (s) => s.profile.bookableOnline && serviceId && s.skillServiceIds.includes(serviceId),
        )
        .map((s) => {
          const first = slotsFor(date, s.resourceId)[0];
          const nextDay = first
            ? undefined
            : week
                .filter((d) => d > date)
                .map((d) => ({ d, slot: slotsFor(d, s.resourceId)[0] }))
                .find((x) => x.slot);
          return {
            id: s.resourceId,
            displayName: s.profile.displayName,
            title: s.profile.title,
            specialty: s.profile.specialty,
            earliest: first ? formatTime(first.startAt) : null,
            nextDay: nextDay?.slot
              ? `Sớm nhất ${weekdayShort(nextDay.d)} ${formatDay(nextDay.d).slice(-5)}`
              : undefined,
          };
        }),
    [staff, serviceId, slotsFor, date, week],
  );

  const releaseHold = useCallback(() => {
    setSlot(null);
    setHoldExpiresAt(null);
    setConfirmed(false);
    setNotice(RELEASED);
    setStep('datetime');
  }, []);

  const go = (next: Step) => {
    setNotice(null);
    setStep(next);
  };
  const back = () => {
    const prev = steps[stepIndex - 1];
    if (prev) go(prev);
  };

  function pickSlot(startAt: string) {
    const found = daySlots.find((s) => s.startAt === startAt) ?? null;
    setSlot(found);
    // BR-07: choosing a time starts a 10-minute hold.
    setHoldExpiresAt(found ? addMinutes(now, HOLD_MINUTES) : null);
    setNotice(null);
  }
  function chooseStaff(v: string) {
    setStaffChoice(v);
    setSlot(null);
    setPart(null);
  }

  const phoneE164 = normalizePhone(phone);
  const phoneError =
    phoneTouched && !phoneE164 ? 'Số điện thoại chưa đúng. Ví dụ: 0912 345 678.' : null;
  const emailError =
    emailTouched && !isEmail(email) ? 'Email chưa đúng. Ví dụ: thu@example.com.' : null;
  const infoReady =
    name.trim().length > 0 && Boolean(phoneE164) && isEmail(email) && /^\d{6}$/.test(otp);

  const slotLine = slot
    ? `${formatTime(slot.startAt)} · ${formatDay(localDate(slot.startAt))}`
    : '';
  const assignedStaff = slot
    ? staffChoice === ANY_STAFF
      ? `${staffName(slot.staffResourceId)}, xếp tự động`
      : staffName(slot.staffResourceId)
    : '';

  const summary = variant && service && (
    <div className="flex flex-col gap-(--space-1) rounded-(--radius-md) bg-(--fill-tonal) p-(--space-4)">
      <div className="flex items-start justify-between gap-(--space-2)">
        <span className="body font-semibold">
          {service.name} · {variant.name}
        </span>
        {step !== 'service' && !confirmed && (
          <Button variant="ghost" size="sm" onClick={() => go('service')}>
            Đổi
          </Button>
        )}
      </div>
      <span className="body-sm sp-num text-(--ink-muted)">
        {formatMinutes(duration(variant))} · {formatVnd(variant.priceVnd)}
      </span>
      {subject && <span className="body-sm text-(--ink-muted)">Cho {subject.name}</span>}
    </div>
  );

  const hold = holdExpiresAt && slot && !confirmed && (step === 'info' || step === 'confirm') && (
    <HoldBanner
      expiresAt={holdExpiresAt}
      now={now}
      note={`${slotLine} · ${staffName(slot.staffResourceId)}`}
      onExpire={releaseHold}
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
            meta: 'Giá theo loài và cân nặng',
            price: `từ ${formatVnd(min)}`,
          };
        })}
      />
    ) : (
      <div className="sp-stack">
        {services.map((s) => (
          <ServiceVariantList
            key={s.id}
            name={s.name}
            selected={variantId}
            onSelect={(id) => {
              setServiceId(s.id);
              setVariantId(id);
              setSlot(null);
            }}
            variants={s.variants.map((v) => ({
              id: v.id,
              name: v.name,
              meta: formatMinutes(duration(v)),
              price: formatVnd(v.priceVnd),
            }))}
          />
        ))}
      </div>
    );
    cta = {
      title:
        variant && service
          ? `${service.name} · ${variant.name}`
          : service
            ? service.name
            : 'Chưa chọn dịch vụ',
      subtitle: variant ? formatVnd(variant.priceVnd) : undefined,
      label: 'Tiếp tục',
      disabled: !service || (!asksSubject && !variant),
      onClick: () => go(steps[1]!),
    };
  }

  if (step === 'subject' && service) {
    const options = saved.filter((s) => service.variants.some((v) => matches(v, s)));
    const newVariant = newSubject && service.variants.find((v) => matches(v, newSubject));
    title = 'Cho bé nào?';
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
                meta: `${subjectMeta(s)} · ${v.name} · ${formatMinutes(duration(v))}`,
                price: formatVnd(v.priceVnd),
              };
            }),
            {
              id: NEW_SUBJECT,
              name: 'Thêm bé',
              meta: newVariant
                ? `${newSubject.name} · ${newVariant.name} · ${formatMinutes(duration(newVariant))}`
                : 'Tên, loài và cân nặng',
              price: newVariant ? formatVnd(newVariant.priceVnd) : '',
            },
          ]}
        />
        {subjectId === NEW_SUBJECT && (
          <div className="sp-stack rounded-(--radius-lg) bg-(--surface-raised) p-(--space-4) shadow-[0_0_0_1px_var(--line)]">
            <Field id="pet-name" label="Tên bé">
              <input
                id="pet-name"
                placeholder="Ví dụ: Mochi"
                value={petName}
                onChange={(e) => setPetName(e.target.value)}
              />
            </Field>
            <div className="sp-field">
              <span className="sp-field__label" id="pet-species-label">
                Loài
              </span>
              <div
                role="group"
                aria-labelledby="pet-species-label"
                className="sp-segmented sp-segmented--lg sp-segmented--block"
              >
                {(
                  [
                    ['dog', 'Chó'],
                    ['cat', 'Mèo'],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className="sp-segmented__item"
                    aria-pressed={petSpecies === value}
                    onClick={() => setPetSpecies(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <Field id="pet-weight" label="Cân nặng (kg)">
              <input
                id="pet-weight"
                inputMode="decimal"
                placeholder="Ví dụ: 6"
                value={petWeight}
                onChange={(e) => setPetWeight(e.target.value.replace(/[^\d.,]/g, ''))}
              />
            </Field>
            <p className="body-sm m-0 text-(--ink-muted)" aria-live="polite">
              {newSubject
                ? newVariant
                  ? `Giá cho ${newSubject.name}: ${newVariant.name}, ${formatVnd(newVariant.priceVnd)}.`
                  : `${service.name} chưa nhận ${petSpecies === 'cat' ? 'mèo' : 'bé này'}. Chọn dịch vụ khác.`
                : 'Giá theo loài và cân nặng, hiện ngay khi nhập.'}
            </p>
          </div>
        )}
        {subject && subjectId !== NEW_SUBJECT && (
          <p className="body-sm m-0 text-(--ink-muted)">
            Giá theo loài và cân nặng của {subject.name}.
          </p>
        )}
      </div>
    );
    cta = {
      title: subject && variant ? `${subject.name} · ${service.name}` : 'Chưa chọn bé',
      subtitle: variant ? formatVnd(variant.priceVnd) : undefined,
      label: 'Tiếp tục',
      disabled: !variant,
      onClick: () => go('datetime'),
    };
  }

  if (step === 'datetime' && service && variant) {
    const nextOpen = daySlots.length
      ? null
      : week.filter((d) => d > date).find((d) => slotsFor(d, staffChoice).length > 0);
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
            noun={staffNoun}
            options={staffOptions}
            value={staffChoice}
            onChange={chooseStaff}
            context={`${staffNoun} làm được ${service.name} · ${formatDay(date)}`}
            anyEarliest={daySlots[0] ? formatTime(daySlots[0].startAt) : null}
          />
        </div>
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
        <p className="body-sm m-0 text-(--ink-muted)">
          {variant.segments.some((s) => s.kind === 'wait') && 'Thời lượng đã gồm thời gian chờ. '}
          Giờ theo giờ Việt Nam.
        </p>
      </div>
    );
    cta = {
      title: slot ? slotLine : 'Chưa chọn giờ',
      subtitle: slot
        ? staffChoice === ANY_STAFF
          ? `${staffNoun} được xếp tự động`
          : staffName(slot.staffResourceId)
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
          <Field id="booking-otp" label="Mã xác nhận" help={`Đã gửi mã 6 số tới ${email.trim()}.`}>
            <input
              id="booking-otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="Ví dụ: 123456"
              value={otp}
              aria-describedby="booking-otp-help"
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
            />
          </Field>
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

  if (step === 'confirm' && service && variant && slot) {
    title = confirmed ? 'Đã đặt lịch' : 'Xác nhận';
    const rows: [string, string][] = [
      ['Dịch vụ', `${service.name} · ${variant.name}`],
      ...(subject ? [['Cho', subject.name] as [string, string]] : []),
      ['Thời gian', `${slotLine} · ${formatMinutes(duration(variant))}`],
      [staffNoun, assignedStaff],
      ['Liên hệ', `${name} · ${phoneE164 ? formatPhone(phoneE164) : ''} · ${email.trim()}`],
      ['Giá', formatVnd(variant.priceVnd)],
      ...(variant.depositVnd
        ? [['Đặt cọc', formatVnd(variant.depositVnd)] as [string, string]]
        : []),
    ];
    const end = addMinutes(slot.startAt, duration(variant));
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
        {variant.depositVnd && !confirmed && (
          <p className="body-sm m-0 text-(--ink-muted)">
            Đặt cọc {formatVnd(variant.depositVnd)} để giữ lịch, trừ vào tiền dịch vụ. Hủy miễn phí
            trước 24 giờ.
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
                  title: `${service.name} · ${tenant.name}`,
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
          title: variant.depositVnd
            ? `Cọc ${formatVnd(variant.depositVnd)}`
            : formatVnd(variant.priceVnd),
          subtitle: slotLine,
          label: 'Xác nhận đặt lịch',
          disabled: false,
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
          {step === 'datetime' && variant && (
            <div className="flex flex-col gap-(--space-2)">
              <span className="label text-(--ink-muted)">{staffNoun}</span>
              <StaffOptionList
                compact
                noun={staffNoun}
                options={staffOptions}
                value={staffChoice}
                onChange={chooseStaff}
                anyEarliest={daySlots[0] ? formatTime(daySlots[0].startAt) : null}
              />
            </div>
          )}
          {step !== 'datetime' && slot && (
            <div className="flex flex-col gap-0.5">
              <span className="label text-(--ink-muted)">Thời gian</span>
              <span className="body sp-num">{slotLine}</span>
              <span className="body-sm text-(--ink-muted)">{assignedStaff}</span>
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
