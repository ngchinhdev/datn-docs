'use client';

import { Check, CircleAlert, Footprints, Plus, Search, UserPlus } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useScheduleStore } from '@/components/mock/schedule-store';
import { Button } from '@/components/sapio/button';
import { Field } from '@/components/sapio/form';
import type { CalendarTarget } from '@/components/sapio/resource-calendar';
import { SidePanel } from '@/components/sapio/side-panel';
import { SubjectFields } from '@/components/sapio/subject-fields';
import { useToast } from '@/components/sapio/toast';
import { searchCustomers, preferredStaffOf } from '@/mock/customer-search';
import type {
  Appointment,
  Customer,
  ServedSubject,
  ServiceVariant,
  TenantFixture,
} from '@/mock/fixtures';
import { formatDuration, formatPhone, formatVnd, normalizePhone } from '@/mock/format';
import { ANY_STAFF, matchesAttributes, priceFor, visibleMinutes } from '@/mock/occupation';
import { parseTime, placeItem } from '@/mock/placement';
import { capableStaff, pricedStaff } from '@/mock/services';
import { checkSubject, describeSubject, type SubjectValues } from '@/mock/subject-schema';
import { formatDay, formatTime, localToUtc } from '@/mock/time';

type Pick = { kind: 'existing'; id: string } | { kind: 'new' } | { kind: 'walkin' };

const NEW_PET = 'new-pet';
/** Ids of what the session creates; the mock has no server to number them. */
let sequence = 0;

const hhmm = (minute: number) =>
  `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .slice(-2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
const lowerFirst = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);

export interface CreatePanelProps {
  /** The tenant as the session has it (appointments, customers, shifts, leave). */
  fixture: TenantFixture;
  /** Local date `YYYY-MM-DD` of the calendar being looked at. */
  date: string;
  now: string;
  /** Prefilled from the cell that was pressed, or the nearest free time. */
  initial: { minute: number; staffResourceId: string };
  presetCustomerId?: string | null;
  onClose: () => void;
  /** The outlined blocks to draw on the calendar. */
  onTargets: (targets: CalendarTarget[]) => void;
  onCreated: (appointmentId: string) => void;
}

/** Tạo lịch hẹn (MH-26): customer, service, person and time, checked against the calendar at once. */
export function CreatePanel({
  fixture,
  date,
  now,
  initial,
  presetCustomerId,
  onClose,
  onTargets,
  onCreated,
}: CreatePanelProps) {
  const uid = useId();
  const toast = useToast();
  const store = useScheduleStore();
  const { vocabulary, subjectSchema } = fixture.template;
  const asksSubject = vocabulary.subject !== null;
  const subjectNoun = vocabulary.subject ?? '';
  const tenantId = fixture.tenant.id;
  const nameOf = (id: string) => fixture.resources.find((r) => r.id === id)?.name ?? id;

  // ---- Customer ----
  const preset = fixture.customers.find((c) => c.id === presetCustomerId);
  const [query, setQuery] = useState(preset ? formatPhone(preset.phone) : '');
  const [picked, setPicked] = useState<Pick | null>(
    preset
      ? { kind: 'existing', id: preset.id }
      : presetCustomerId === 'walkin'
        ? { kind: 'walkin' }
        : null,
  );
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const touch = (key: string) => setTouched((t) => new Set(t).add(key));
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!preset) searchRef.current?.focus();
  }, [preset]);

  const found = useMemo(
    () => searchCustomers(fixture.customers, query),
    [fixture.customers, query],
  );
  const customer =
    picked?.kind === 'existing' ? fixture.customers.find((c) => c.id === picked.id) : undefined;
  const digits = query.replace(/\D/g, '');
  const typedPhone = normalizePhone(query);
  const phoneError =
    picked?.kind === 'new' && !normalizePhone(newPhone)
      ? 'Số điện thoại chưa đúng. Ví dụ: 0912 345 678.'
      : undefined;
  const nameError = picked?.kind === 'new' && !newName.trim() ? 'Nhập tên khách.' : undefined;
  const customerReady =
    picked?.kind === 'walkin' ||
    Boolean(customer) ||
    (picked?.kind === 'new' && !phoneError && !nameError);

  // ---- Pet (industries that serve something other than the customer) ----
  const pets: ServedSubject[] = customer
    ? fixture.servedSubjects.filter((s) => s.customerId === customer.id && s.kind === 'other')
    : [];
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [petName, setPetName] = useState('');
  const [petValues, setPetValues] = useState<SubjectValues>({});
  const [petTouched, setPetTouched] = useState<Set<string>>(new Set());
  const petCheck = checkSubject(subjectSchema, subjectNoun, petName, petValues);
  const newPet: ServedSubject | null =
    Object.keys(petCheck.errors).length === 0
      ? {
          id: `${tenantId}-s-new${sequence + 1}`,
          tenantId,
          customerId: '',
          kind: 'other',
          name: petName.trim(),
          attributes: petCheck.attributes,
        }
      : null;
  // A customer with one pet starts with it chosen; with none, the form to add one.
  const onlyPet = pets.length === 1 ? pets[0] : undefined;
  const chosenPetId = subjectId ?? (onlyPet ? onlyPet.id : picked && !customer ? NEW_PET : null);
  const subject =
    chosenPetId === NEW_PET ? newPet : (pets.find((p) => p.id === chosenPetId) ?? null);
  const showPetForm = chosenPetId === NEW_PET;

  // ---- Service, variant, person, time ----
  const [serviceId, setServiceId] = useState(fixture.services[0]?.id ?? '');
  const service = fixture.services.find((s) => s.id === serviceId) ?? fixture.services[0]!;
  const capable = capableStaff(service, fixture.staff);
  const [chosenVariantId, setChosenVariantId] = useState('');
  const variant: ServiceVariant | null = asksSubject
    ? ((subject && service.variants.find((v) => matchesAttributes(v.match, subject.attributes))) ??
      null)
    : (service.variants.find((v) => v.id === chosenVariantId) ?? service.variants[0] ?? null);
  const [staffWanted, setStaffWanted] = useState(initial.staffResourceId);
  const staffId = capable.some((s) => s.resourceId === staffWanted) ? staffWanted : ANY_STAFF;
  const [named, setNamed] = useState(false);
  const [timeText, setTimeText] = useState(hhmm(initial.minute));
  const minute = parseTime(timeText);
  const [note, setNote] = useState('');

  const result = useMemo(
    () =>
      variant && minute !== null
        ? placeItem({
            fixture,
            service,
            variant,
            date,
            minute,
            staffResourceId: staffId,
            ...(subject && asksSubject ? { subjectName: subject.name } : {}),
            now,
          })
        : null,
    [fixture, service, variant, date, minute, staffId, subject, asksSubject, now],
  );

  // The outlined block on the calendar follows the form.
  const targetKey = JSON.stringify([
    result?.ok ? result.placement : null,
    result && !result.ok ? staffId : null,
    minute,
    variant?.id,
  ]);
  useEffect(() => {
    if (!variant || minute === null || !result) {
      onTargets([]);
      return;
    }
    const startAt = localToUtc(date, hhmm(minute));
    const endAt = new Date(Date.parse(startAt) + visibleMinutes(variant) * 60_000).toISOString();
    if (result.ok) {
      onTargets(
        Object.values(result.placement.assignment).map((columnId) => ({
          columnId,
          startAt,
          endAt,
          text: `Lịch mới · ${hhmm(minute)}–${formatTime(endAt)}`,
        })),
      );
    } else {
      onTargets(
        staffId === ANY_STAFF
          ? []
          : [
              {
                columnId: staffId,
                startAt,
                endAt,
                text: `${hhmm(minute)} không đặt được`,
                bad: true,
              },
            ],
      );
    }
    // `targetKey` stands for the values read above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetKey]);
  useEffect(() => () => onTargets([]), [onTargets]);

  // ---- Price ----
  const price = variant
    ? named && staffId !== ANY_STAFF
      ? priceFor(variant, staffId, pricedStaff(capable))
      : priceFor(variant, ANY_STAFF, pricedStaff(capable))
    : 0n;

  const ready = Boolean(result?.ok) && customerReady && (!asksSubject || subject !== null);

  function create() {
    if (!result?.ok || !variant || !ready) return;
    sequence += 1;
    const n = sequence;
    let customerId = customer?.id ?? '';
    let madeCustomer: Customer | null = null;
    let madeSubject: ServedSubject | null = null;
    if (!customer) {
      const name = picked?.kind === 'new' ? newName.trim() : 'Khách lẻ';
      madeCustomer = {
        id: `${tenantId}-c-new${n}`,
        tenantId,
        name,
        callName: picked?.kind === 'new' ? (name.split(/\s+/).at(-1) ?? name) : name,
        phone: picked?.kind === 'new' ? (normalizePhone(newPhone) ?? '') : '',
        visitCount: 0,
      };
      customerId = madeCustomer.id;
      store.addCustomer(madeCustomer);
    }
    let servedSubjectId = '';
    if (asksSubject && subject) {
      if (chosenPetId === NEW_PET) {
        madeSubject = { ...subject, id: `${tenantId}-s-new${n}`, customerId };
        store.addSubject(madeSubject);
        servedSubjectId = madeSubject.id;
      } else servedSubjectId = subject.id;
    } else if (!asksSubject) {
      const own = fixture.servedSubjects.find(
        (s) => s.customerId === customerId && s.kind === 'self',
      );
      if (own) servedSubjectId = own.id;
      else if (madeCustomer) {
        madeSubject = {
          id: `${tenantId}-s-new${n}`,
          tenantId,
          customerId,
          kind: 'self',
          name: madeCustomer.name,
          attributes: {},
        };
        store.addSubject(madeSubject);
        servedSubjectId = madeSubject.id;
      }
    }
    const appt: Appointment = {
      id: `${tenantId}-a-new${n}`,
      tenantId,
      branchId: fixture.branches[0]?.id ?? '',
      customerId,
      startAt: result.placement.startAt,
      status: 'confirmed',
      channel: 'walk_in',
      items: [
        {
          serviceVariantId: variant.id,
          servedSubjectId,
          staffResourceId: result.placement.staffResourceId,
          staffChoice: named && staffId !== ANY_STAFF ? 'chosen' : 'any',
          priceVnd: price,
        },
      ],
      bookings: result.placement.bookings,
      ...(note.trim() ? { note: note.trim() } : {}),
    };
    store.addAppointment(appt);
    const who = customer?.name ?? madeCustomer?.name ?? 'khách';
    toast({
      text: `Đã tạo lịch cho ${who} lúc ${formatTime(appt.startAt)}.`,
      undo: () => {
        store.removeAppointment(appt.id);
        if (madeSubject) store.removeSubject(madeSubject.id);
        if (madeCustomer) store.removeCustomer(madeCustomer.id);
      },
    });
    onCreated(appt.id);
  }

  // ---- Pieces ----
  const staffNoun = vocabulary.staff.charAt(0).toUpperCase() + vocabulary.staff.slice(1);
  const staffName = staffId === ANY_STAFF ? '' : nameOf(staffId);
  const customerMeta = (c: Customer) => {
    const preferred = preferredStaffOf(fixture, c.id);
    const petCount = asksSubject
      ? fixture.servedSubjects.filter((s) => s.customerId === c.id && s.kind === 'other').length
      : 0;
    return [
      c.phone ? formatPhone(c.phone) : null,
      asksSubject && petCount > 0 ? `${petCount} ${subjectNoun}` : null,
      !asksSubject && c.visitCount ? `lần thứ ${c.visitCount}` : null,
      !asksSubject && preferred
        ? `${lowerFirst(vocabulary.staff)} quen ${nameOf(preferred)}`
        : null,
    ]
      .filter(Boolean)
      .join(' · ');
  };
  const typedLabel = typedPhone
    ? formatPhone(typedPhone)
    : digits
      ? `${digits.replace(/(\d{4})(?=\d)/, '$1 ')}…`
      : '';

  const nearest = result && !result.ok ? result.nearest : [];
  const fitOk = result?.ok ? result.placement : null;
  const others = fitOk
    ? Object.values(fitOk.assignment)
        .filter((id) => id !== fitOk.staffResourceId)
        .map(nameOf)
    : [];

  return (
    <SidePanel
      title="Tạo lịch hẹn"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Hủy
          </Button>
          <Button variant="primary" disabled={!ready} onClick={create}>
            Tạo lịch hẹn
          </Button>
        </>
      }
    >
      {/* Customer */}
      {asksSubject && customer ? (
        <div className="sp-pick__item" aria-selected="true" style={{ cursor: 'default' }}>
          <span className="sp-avatar sp-avatar--sm">{initialsOf(customer.name)}</span>
          <span>
            <span className="sp-pick__name">{customer.name}</span>
            <span className="sp-pick__meta">{customerMeta(customer)}</span>
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setPicked(null);
              setSubjectId(null);
            }}
          >
            Đổi khách
          </Button>
        </div>
      ) : (
        <>
          <Field
            id={`${uid}-find`}
            label="Khách"
            help="Tìm theo số điện thoại hoặc tên. Số được chuẩn hóa trước khi tìm (BR-61)."
          >
            <Search size={16} aria-hidden="true" className="ms-3 flex-none text-(--ink-muted)" />
            <input
              ref={searchRef}
              id={`${uid}-find`}
              type="search"
              value={query}
              autoComplete="off"
              aria-controls={`${uid}-results`}
              onChange={(e) => {
                setQuery(e.target.value);
                if (picked?.kind === 'existing') setPicked(null);
              }}
            />
          </Field>
          <ul
            className="sp-pick"
            id={`${uid}-results`}
            role="listbox"
            aria-label="Kết quả tìm khách"
          >
            {found.map((c) => (
              <li key={c.id} role="presentation">
                <button
                  type="button"
                  className="sp-pick__item"
                  role="option"
                  aria-selected={picked?.kind === 'existing' && picked.id === c.id}
                  onClick={() => {
                    setPicked({ kind: 'existing', id: c.id });
                    setSubjectId(null);
                  }}
                >
                  <span className="sp-avatar sp-avatar--sm">{initialsOf(c.name)}</span>
                  <span>
                    <span className="sp-pick__name">{c.name}</span>
                    <span className="sp-pick__meta">{customerMeta(c)}</span>
                  </span>
                  {picked?.kind === 'existing' && picked.id === c.id ? (
                    <Check size={16} aria-hidden="true" />
                  ) : (
                    <span />
                  )}
                </button>
              </li>
            ))}
            <li role="presentation">
              <button
                type="button"
                className="sp-pick__item"
                role="option"
                aria-selected={picked?.kind === 'new'}
                onClick={() => {
                  setPicked({ kind: 'new' });
                  setSubjectId(null);
                  if (!newPhone && typedPhone) setNewPhone(formatPhone(typedPhone));
                  else if (!newPhone && digits) setNewPhone(digits);
                }}
              >
                <span className="sp-avatar sp-avatar--sm">
                  <UserPlus size={14} aria-hidden="true" />
                </span>
                <span>
                  <span className="sp-pick__name">
                    {typedLabel ? `Khách mới với số ${typedLabel}` : 'Khách mới'}
                  </span>
                  <span className="sp-pick__meta">
                    {typedPhone ? 'Điền tên khách bên dưới' : 'Nhập đủ số rồi điền tên'}
                  </span>
                </span>
                {picked?.kind === 'new' ? <Check size={16} aria-hidden="true" /> : <span />}
              </button>
            </li>
            <li role="presentation">
              <button
                type="button"
                className="sp-pick__item"
                role="option"
                aria-selected={picked?.kind === 'walkin'}
                onClick={() => {
                  setPicked({ kind: 'walkin' });
                  setSubjectId(null);
                }}
              >
                <span className="sp-avatar sp-avatar--sm">
                  <Footprints size={14} aria-hidden="true" />
                </span>
                <span>
                  <span className="sp-pick__name">Khách vãng lai</span>
                  <span className="sp-pick__meta">
                    Không cần số điện thoại, ghi là &quot;Khách lẻ&quot;
                  </span>
                </span>
                {picked?.kind === 'walkin' ? <Check size={16} aria-hidden="true" /> : <span />}
              </button>
            </li>
          </ul>
        </>
      )}
      {picked?.kind === 'new' && (
        <div className="grid grid-cols-2 gap-(--space-3)">
          <Field
            id={`${uid}-new-name`}
            label="Tên khách"
            error={touched.has('name') ? nameError : undefined}
          >
            <input
              id={`${uid}-new-name`}
              value={newName}
              aria-invalid={touched.has('name') && nameError ? true : undefined}
              onChange={(e) => setNewName(e.target.value)}
              onBlur={() => touch('name')}
            />
          </Field>
          <Field
            id={`${uid}-new-phone`}
            label="Số điện thoại"
            error={touched.has('phone') ? phoneError : undefined}
          >
            <input
              id={`${uid}-new-phone`}
              inputMode="tel"
              value={newPhone}
              aria-invalid={touched.has('phone') && phoneError ? true : undefined}
              onChange={(e) => setNewPhone(e.target.value)}
              onBlur={() => touch('phone')}
            />
          </Field>
        </div>
      )}

      {/* Pet */}
      {asksSubject && picked && (
        <fieldset className="m-0 flex flex-col gap-(--space-2) border-0 p-0">
          <legend className="sp-field__label pb-1.5">{vocabulary.subjectQuestion ?? ''}</legend>
          {pets.map((pet) => (
            <label key={pet.id} className="sp-variant">
              <input
                type="radio"
                name={`${uid}-pet`}
                checked={chosenPetId === pet.id}
                onChange={() => setSubjectId(pet.id)}
              />
              <span>
                <span className="sp-variant__name">{pet.name}</span>
                <br />
                <span className="sp-variant__meta">{describeSubject(subjectSchema, pet)}</span>
              </span>
              <span />
            </label>
          ))}
          {customer && !showPetForm && (
            <Button
              variant="ghost"
              size="sm"
              className="self-start"
              onClick={() => setSubjectId(NEW_PET)}
            >
              <Plus size={16} aria-hidden="true" />
              {vocabulary.addSubject ?? 'Thêm'}
            </Button>
          )}
          {showPetForm && (
            <div className="flex flex-col gap-(--space-3) rounded-(--radius-md) bg-(--fill-tonal) p-(--space-3)">
              <SubjectFields
                idPrefix={`${uid}-pet-new`}
                schema={subjectSchema}
                noun={subjectNoun}
                nameExample={vocabulary.subjectExample}
                name={petName}
                values={petValues}
                onName={setPetName}
                onValue={(key, value) => setPetValues((v) => ({ ...v, [key]: value }))}
                error={(key) => (petTouched.has(key) ? petCheck.errors[key] : undefined)}
                touch={(key) => setPetTouched((t) => new Set(t).add(key))}
                size="sm"
              />
            </div>
          )}
        </fieldset>
      )}

      {/* Service, variant */}
      <div className="grid grid-cols-2 gap-(--space-3)">
        <Field id={`${uid}-svc`} label="Dịch vụ">
          <select
            id={`${uid}-svc`}
            value={service.id}
            onChange={(e) => {
              setServiceId(e.target.value);
              setChosenVariantId('');
            }}
          >
            {fixture.services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
        {!asksSubject && (
          <Field id={`${uid}-var`} label="Biến thể">
            <select
              id={`${uid}-var`}
              value={variant?.id ?? ''}
              onChange={(e) => setChosenVariantId(e.target.value)}
            >
              {service.variants.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} · {formatDuration(visibleMinutes(v))}
                </option>
              ))}
            </select>
          </Field>
        )}
        {asksSubject && (
          <p className="sp-field__help col-span-full m-0">
            {variant && subject
              ? `${variant.name} · ${formatDuration(visibleMinutes(variant))} · ${formatVnd(price)}. Biến thể chọn theo thông tin của ${subject.name} (BR-55).`
              : `Biến thể chọn theo thông tin của ${subjectNoun} (BR-55).`}
          </p>
        )}
        <Field
          id={`${uid}-staff`}
          label={staffNoun}
          help={initial.staffResourceId !== ANY_STAFF ? 'Điền sẵn từ cột bạn bấm.' : undefined}
        >
          <select
            id={`${uid}-staff`}
            value={staffId}
            onChange={(e) => {
              setStaffWanted(e.target.value);
              if (e.target.value === ANY_STAFF) setNamed(false);
            }}
          >
            <option value={ANY_STAFF}>Bất kỳ ai</option>
            {capable.map((s) => (
              <option key={s.resourceId} value={s.resourceId}>
                {s.profile.displayName}
              </option>
            ))}
          </select>
        </Field>
        <Field
          id={`${uid}-time`}
          label="Giờ bắt đầu"
          help={`${formatDay(date)}. Gõ được giờ lẻ như 14:05 (BR-58).`}
          error={minute === null ? 'Giờ chưa đúng. Ví dụ: 14:05.' : undefined}
        >
          <input
            id={`${uid}-time`}
            inputMode="numeric"
            value={timeText}
            aria-invalid={minute === null ? true : undefined}
            onChange={(e) => setTimeText(e.target.value)}
          />
        </Field>
      </div>
      {staffId !== ANY_STAFF && (
        <label className="sp-check">
          <input type="checkbox" checked={named} onChange={(e) => setNamed(e.target.checked)} />
          <span>
            Khách yêu cầu đích danh {staffName}
            <span className="sp-check__hint">
              Đổi người sau này sẽ phải hỏi ý khách (BR-11). Giá theo cấp của {staffName}.
            </span>
          </span>
        </label>
      )}

      {/* Does it fit? */}
      {fitOk ? (
        <p className="sp-fit sp-fit--ok" role="status">
          <Check aria-hidden="true" />
          <span>
            Trống: {[nameOf(fitOk.staffResourceId), ...others].join(', ')}. Xong lúc{' '}
            {formatTime(fitOk.endAt)}.
          </span>
        </p>
      ) : result && !result.ok ? (
        <p className="sp-fit sp-fit--bad" role="status">
          <CircleAlert aria-hidden="true" />
          <span>{result.reason}</span>
        </p>
      ) : (
        <p className="sp-fit" role="status">
          <span>
            {minute === null
              ? 'Nhập giờ để kiểm tra.'
              : `Chọn ${subjectNoun || 'dịch vụ'} để kiểm tra giờ.`}
          </span>
        </p>
      )}
      {nearest.length > 0 && (
        <div className="flex flex-col gap-(--space-2)">
          <span className="sp-field__label">Giờ gần nhất còn trống</span>
          <div className="sp-chips">
            {nearest.map((s) => (
              <button
                key={s.startAt}
                type="button"
                className="sp-chip"
                onClick={() => {
                  setTimeText(formatTime(s.startAt));
                  if (staffId !== ANY_STAFF && s.staffResourceId !== staffId) {
                    setStaffWanted(s.staffResourceId);
                    setNamed(false);
                  }
                }}
              >
                {formatTime(s.startAt)} · {nameOf(s.staffResourceId)}
              </button>
            ))}
          </div>
        </div>
      )}

      {variant && (
        <dl className="sp-kv rounded-(--radius-md) bg-(--fill-tonal) p-3">
          <dt>
            {service.name} · {variant.name}
          </dt>
          <dd>{formatVnd(price)}</dd>
          <dt>Cọc</dt>
          <dd>Không cần</dd>
          <dt>Trạng thái</dt>
          <dd>Đã xác nhận ngay</dd>
        </dl>
      )}
      <Field id={`${uid}-note`} label="Ghi chú nội bộ" optional area>
        <textarea
          id={`${uid}-note`}
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </Field>
    </SidePanel>
  );
}
