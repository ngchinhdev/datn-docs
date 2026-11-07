'use client';

import { ArrowLeft } from 'lucide-react';
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { BottomBar } from '@/components/sapio/bottom-bar';
import { Button } from '@/components/sapio/button';
import { DateStrip } from '@/components/sapio/date-strip';
import { HoldBanner } from '@/components/sapio/hold-banner';
import { PhoneField } from '@/components/sapio/phone-field';
import { ServiceVariantList } from '@/components/sapio/service-variant-list';
import { SlotGrid, type SlotGroup } from '@/components/sapio/slot-grid';
import { ANY_STAFF, StaffPicker, type StaffOption } from '@/components/sapio/staff-picker';
import { StatusBadge } from '@/components/sapio/status-badge';
import { useMockNow } from '@/components/sapio/use-mock-now';
import { cn } from '@/lib/utils';
import { freeSlots, type FreeSlot } from '@/mock/availability';
import { openingHours } from '@/mock/hours';
import { tenantFixtures, type ServedSubject, type ServiceVariant } from '@/mock/fixtures';
import { formatMinutes, formatPhone, formatVnd, normalizePhone } from '@/mock/format';
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

const HOLD_MINUTES = 10;
const RELEASED = 'Chỗ đã được trả lại. Chọn giờ khác.';
/** The mock customer is a returning one, so their served subjects are known. */
const RETURNING_CUSTOMER = { may: 'may-c-thu', pawpaw: 'paw-c-linh' } as Record<string, string>;

const duration = (v: ServiceVariant) => Math.max(...v.segments.map((s) => s.endMinute));
const matches = (v: ServiceVariant, subject: ServedSubject) =>
  Object.entries(v.match).every(([key, value]) => subject.attributes[key] === value);

function subjectMeta(subject: ServedSubject) {
  const { breed, weightKg } = subject.attributes;
  return [breed, weightKg && `${weightKg} kg`].filter(Boolean).join(' · ');
}

function groupByDayPart(slots: FreeSlot[]): SlotGroup[] {
  const parts = [
    { label: 'Buổi sáng', until: 12 },
    { label: 'Buổi chiều', until: 17 },
    { label: 'Buổi tối', until: 24 },
  ];
  return parts.map((part, i) => ({
    label: part.label,
    slots: slots
      .filter((s) => {
        const hour = Number(formatTime(s.startAt).slice(0, 2));
        return hour < part.until && hour >= (parts[i - 1]?.until ?? 0);
      })
      .map((s) => ({ value: s.startAt, label: formatTime(s.startAt) })),
  }));
}

function Field({
  id,
  label,
  children,
  help,
}: {
  id: string;
  label: string;
  children: ReactNode;
  help?: string;
}) {
  return (
    <div className="sp-field">
      <label className="sp-field__label" htmlFor={id}>
        {label}
      </label>
      <div className="sp-field__control">{children}</div>
      {help && <span className="sp-field__help">{help}</span>}
    </div>
  );
}

export function BookingFlow({ tenantSlug }: { tenantSlug: string }) {
  const fixture = tenantFixtures.find((f) => f.tenant.slug === tenantSlug) ?? tenantFixtures[0]!;
  const { tenant, services, staff, resources, resourceTypes } = fixture;
  const branch = fixture.branches[0]!;
  const staffNoun = resourceTypes.find((t) => t.isStaff)?.name ?? 'Nhân viên';
  const subjects = fixture.servedSubjects.filter(
    (s) => s.customerId === RETURNING_CUSTOMER[tenant.id],
  );
  const asksSubject = subjects.some((s) => s.kind === 'other');
  const steps: Step[] = asksSubject
    ? ['service', 'subject', 'datetime', 'info', 'confirm']
    : ['service', 'datetime', 'info', 'confirm'];

  const now = useMockNow();
  const today = localDate(MOCK_NOW);
  const [step, setStep] = useState<Step>('service');
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [variantId, setVariantId] = useState<string | null>(null);
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [date, setDate] = useState(today);
  const [staffChoice, setStaffChoice] = useState(ANY_STAFF);
  const [slot, setSlot] = useState<FreeSlot | null>(null);
  const [holdExpiresAt, setHoldExpiresAt] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  const service = services.find((s) => s.id === serviceId) ?? null;
  const subject = subjects.find((s) => s.id === subjectId) ?? null;
  const variant = service?.variants.find((v) => v.id === variantId) ?? null;
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

  function chooseSubject(id: string) {
    setSubjectId(id);
    const chosen = subjects.find((s) => s.id === id);
    // BR-13: the variant follows the served subject's attributes.
    const v = chosen && service?.variants.find((x) => matches(x, chosen));
    setVariantId(v?.id ?? null);
    setSlot(null);
  }

  const phoneE164 = normalizePhone(phone);
  const phoneError =
    phoneTouched && !phoneE164 ? 'Số điện thoại chưa đúng. Ví dụ: 0912 345 678.' : null;
  const infoReady = name.trim().length > 0 && phoneE164 && /^\d{6}$/.test(otp);

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
      <div className="flex justify-between gap-(--space-2)">
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
  let bar: ReactNode = null;

  if (step === 'service') {
    title = 'Chọn dịch vụ';
    body = asksSubject ? (
      <ServiceVariantList
        name="Dịch vụ"
        selected={serviceId}
        onSelect={(id) => {
          setServiceId(id);
          setVariantId(null);
          setSubjectId(null);
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
    bar = (
      <BottomBar
        title={
          variant && service
            ? `${service.name} · ${variant.name}`
            : service
              ? service.name
              : 'Chưa chọn dịch vụ'
        }
        subtitle={variant ? formatVnd(variant.priceVnd) : undefined}
        action={
          <Button
            variant="accent"
            size="lg"
            disabled={!service || (!asksSubject && !variant)}
            onClick={() => go(steps[1]!)}
          >
            Tiếp tục
          </Button>
        }
      />
    );
  }

  if (step === 'subject' && service) {
    const options = subjects.filter((s) => service.variants.some((v) => matches(v, s)));
    title = 'Cho bé nào?';
    body = (
      <div className="sp-stack">
        <ServiceVariantList
          name={service.name}
          selected={subjectId}
          onSelect={chooseSubject}
          variants={options.map((s) => {
            const v = service.variants.find((x) => matches(x, s))!;
            return {
              id: s.id,
              name: s.name,
              meta: `${subjectMeta(s)} · ${v.name} · ${formatMinutes(duration(v))}`,
              price: formatVnd(v.priceVnd),
            };
          })}
        />
        {subject && (
          <p className="body-sm m-0 text-(--ink-muted)">
            Giá theo loài và cân nặng của {subject.name}.
          </p>
        )}
      </div>
    );
    bar = (
      <BottomBar
        title={subject && variant ? `${subject.name} · ${service.name}` : 'Chưa chọn bé'}
        subtitle={variant ? formatVnd(variant.priceVnd) : undefined}
        action={
          <Button variant="accent" size="lg" disabled={!variant} onClick={() => go('datetime')}>
            Tiếp tục
          </Button>
        }
      />
    );
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
        <StaffPicker
          noun={staffNoun}
          options={staffOptions}
          value={staffChoice}
          onChange={(v) => {
            setStaffChoice(v);
            setSlot(null);
          }}
          context={`${staffNoun} làm được ${service.name} · ${formatDay(date)}`}
          anyEarliest={daySlots[0] ? formatTime(daySlots[0].startAt) : null}
        />
        <div className="flex flex-col gap-(--space-2)">
          <span className="label text-(--ink-muted)">Tháng {Number(date.slice(5, 7))}</span>
          <DateStrip
            dates={week.map((d) => ({ date: d, closed: !openingHours(fixture, d) }))}
            selected={date}
            onSelect={(d) => {
              setDate(d);
              setSlot(null);
            }}
          />
        </div>
        <SlotGrid
          groups={groupByDayPart(daySlots)}
          selected={slot?.startAt ?? null}
          onSelect={pickSlot}
          emptyMessage={
            nextOpen
              ? `Hết giờ trống ngày này. Ngày gần nhất còn trống: ${formatDay(nextOpen)}.`
              : 'Hết giờ trống trong 7 ngày tới. Chọn người khác?'
          }
        />
        <p className="body-sm m-0 text-(--ink-muted)">
          {variant.segments.some((s) => s.kind === 'wait') && 'Thời lượng đã gồm thời gian chờ. '}
          Giờ theo giờ Việt Nam.
        </p>
      </div>
    );
    bar = (
      <BottomBar
        title={slot ? slotLine : 'Chưa chọn giờ'}
        subtitle={
          slot
            ? staffChoice === ANY_STAFF
              ? `${staffNoun} được xếp tự động`
              : staffName(slot.staffResourceId)
            : undefined
        }
        action={
          <Button variant="accent" size="lg" disabled={!slot} onClick={() => go('info')}>
            Tiếp tục
          </Button>
        }
      />
    );
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
            placeholder="Nguyễn Minh Thư"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <PhoneField
          id="booking-phone"
          label="Số điện thoại"
          value={phone}
          onChange={(v) => {
            setPhone(v);
            setOtpSent(false);
            setOtp('');
          }}
          onBlur={() => setPhoneTouched(true)}
          error={phoneError}
          help="Mã xác nhận gửi qua tin nhắn."
        />
        {otpSent ? (
          <Field
            id="booking-otp"
            label="Mã xác nhận"
            help={`Đã gửi mã 6 số tới ${phoneE164 ? formatPhone(phoneE164) : ''}.`}
          >
            <input
              id="booking-otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="123456"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
            />
          </Field>
        ) : (
          <div>
            <Button
              disabled={!phoneE164}
              onClick={() => {
                setPhoneTouched(true);
                setOtpSent(true);
              }}
            >
              Gửi mã
            </Button>
          </div>
        )}
      </div>
    );
    bar = (
      <BottomBar
        title={slotLine}
        subtitle={assignedStaff}
        action={
          <Button variant="accent" size="lg" disabled={!infoReady} onClick={() => go('confirm')}>
            Tiếp tục
          </Button>
        }
      />
    );
  }

  if (step === 'confirm' && service && variant && slot) {
    title = confirmed ? 'Đã đặt lịch' : 'Xác nhận';
    const rows: [string, string][] = [
      ['Dịch vụ', `${service.name} · ${variant.name}`],
      ...(subject ? [['Cho', subject.name] as [string, string]] : []),
      ['Thời gian', `${slotLine} · ${formatMinutes(duration(variant))}`],
      [staffNoun, assignedStaff],
      ['Liên hệ', `${name} · ${phoneE164 ? formatPhone(phoneE164) : ''}`],
      ['Giá', formatVnd(variant.priceVnd)],
      ...(variant.depositVnd
        ? [['Đặt cọc', formatVnd(variant.depositVnd)] as [string, string]]
        : []),
    ];
    body = (
      <div className="sp-stack">
        {hold}
        {confirmed && (
          <div className="sp-row">
            <StatusBadge status="confirmed" />
            <span className="body-sm text-(--ink-muted)">
              Đã gửi tin nhắn xác nhận tới {phoneE164 ? formatPhone(phoneE164) : ''}.
            </span>
          </div>
        )}
        <dl className="m-0 flex flex-col rounded-(--radius-lg) bg-(--surface-raised) px-(--space-4) shadow-[0_0_0_1px_var(--line)]">
          {rows.map(([k, v]) => (
            <div
              key={k}
              className="flex justify-between gap-(--space-3) border-b border-(--line) py-(--space-3) last:border-b-0"
            >
              <dt className="body-sm text-(--ink-muted)">{k}</dt>
              <dd className="body sp-num m-0 text-right">{v}</dd>
            </div>
          ))}
        </dl>
        {variant.depositVnd && !confirmed && (
          <p className="body-sm m-0 text-(--ink-muted)">
            Đặt cọc {formatVnd(variant.depositVnd)} để giữ lịch, trừ vào tiền dịch vụ. Hủy miễn phí
            trước 24 giờ.
          </p>
        )}
      </div>
    );
    bar = confirmed ? null : (
      <BottomBar
        title={
          variant.depositVnd ? `Cọc ${formatVnd(variant.depositVnd)}` : formatVnd(variant.priceVnd)
        }
        subtitle={slotLine}
        action={
          <Button variant="accent" size="lg" onClick={() => setConfirmed(true)}>
            {variant.depositVnd ? 'Đặt cọc và đặt lịch' : 'Đặt lịch'}
          </Button>
        }
      />
    );
  }

  return (
    <div
      className={cn(
        `sp-tenant-${tenant.id}`,
        'mx-auto flex w-full max-w-[560px] flex-col gap-(--space-5) pb-32 min-[900px]:max-w-[1040px] min-[900px]:pb-0',
      )}
    >
      <div className="flex items-center gap-(--space-2)">
        <Button
          variant="ghost"
          aria-label="Quay lại"
          className="size-11! rounded-(--radius-pill)! p-0!"
          disabled={stepIndex === 0 || confirmed}
          onClick={back}
        >
          <ArrowLeft size={20} aria-hidden="true" />
        </Button>
        <div className="flex grow flex-col min-[900px]:hidden">
          <span className="body font-semibold">{tenant.name}</span>
          <span className="body-sm text-(--ink-muted)">{branch.name}</span>
        </div>
        <div className="body-sm sp-num ms-auto flex items-center gap-(--space-3) text-(--ink-muted)">
          <span>
            Bước {stepIndex + 1}/{steps.length}
          </span>
          <div
            className="hidden w-40 grid-cols-[repeat(var(--n),minmax(0,1fr))] gap-(--space-1) min-[900px]:grid"
            style={{ ['--n' as string]: steps.length }}
            aria-hidden="true"
          >
            {steps.map((s, i) => (
              <div
                key={s}
                className={cn(
                  'h-1 rounded-(--radius-pill)',
                  i <= stepIndex ? 'bg-(--accent)' : 'bg-(--fill-tonal)',
                )}
              />
            ))}
          </div>
        </div>
      </div>
      <div
        className="grid grid-cols-[repeat(var(--n),minmax(0,1fr))] gap-(--space-1) min-[900px]:hidden"
        style={{ ['--n' as string]: steps.length }}
        aria-hidden="true"
      >
        {steps.map((s, i) => (
          <div
            key={s}
            className={cn(
              'h-1 rounded-(--radius-pill)',
              i <= stepIndex ? 'bg-(--accent)' : 'bg-(--fill-tonal)',
            )}
          />
        ))}
      </div>

      <div className="min-[900px]:flex min-[900px]:overflow-hidden min-[900px]:rounded-(--radius-lg) min-[900px]:bg-(--surface-raised) min-[900px]:shadow-[0_0_0_1px_var(--line),var(--shadow-card)]">
        <section
          aria-label="Tóm tắt"
          className="hidden min-w-0 flex-[1_1_300px] flex-col gap-(--space-5) p-(--space-6) shadow-[1px_0_0_var(--line)] min-[900px]:flex"
        >
          <div className="flex flex-col gap-(--space-1)">
            <span className="title">{tenant.name}</span>
            <span className="body-sm text-(--ink-muted)">{branch.address}</span>
          </div>
          {summary}
          {slot && (
            <div className="flex flex-col gap-(--space-1)">
              <span className="label text-(--ink-muted)">Thời gian</span>
              <span className="body sp-num">{slotLine}</span>
              <span className="body-sm text-(--ink-muted)">{assignedStaff}</span>
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
          {bar}
        </section>
      </div>
    </div>
  );
}
