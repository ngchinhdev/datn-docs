'use client';

import { Upload } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { useStaffStore } from '@/components/mock/staff-store';
import { useAppHref } from '@/components/mock/use-app-href';
import { Button } from '@/components/sapio/button';
import { ConfirmDialog } from '@/components/sapio/confirm-dialog';
import { CheckRow, Field, Form, FormSection, SaveBar, SwitchRow } from '@/components/sapio/form';
import { PageHeader } from '@/components/sapio/page-header';
import { useToast } from '@/components/sapio/toast';
import { useUnsavedGuard } from '@/components/sapio/use-unsaved-guard';
import { tenantFixtures, type Staff, type StaffRoleId } from '@/mock/fixtures';
import { formatPhone, normalizePhone } from '@/mock/format';
import { roleLabel } from '@/mock/selection';
import { MOCK_NOW } from '@/mock/time';

const SPECIALTY_MAX = 40;

const ROLES: { id: StaffRoleId; help: string }[] = [
  { id: 'technician', help: 'Kỹ thuật viên chỉ thấy lịch của mình.' },
  { id: 'receptionist', help: 'Lễ tân thấy lịch và khách của chi nhánh, và thu tiền.' },
  { id: 'manager', help: 'Quản lý thấy thêm xếp ca, nghỉ phép và báo cáo của chi nhánh.' },
  { id: 'owner', help: 'Chủ cơ sở thấy mọi mục, kể cả cài đặt.' },
];

interface Draft {
  displayName: string;
  title: string;
  specialty: string;
  bookableOnline: boolean;
  fullName: string;
  employeeCode: string;
  phone: string;
  email: string;
  role: StaffRoleId;
  level: number;
  skills: string[];
}

type Errors = Partial<Record<'displayName' | 'specialty' | 'phone' | 'email' | 'fullName', string>>;

const toDraft = (s: Staff): Draft => ({
  displayName: s.profile.displayName,
  title: s.profile.title,
  specialty: s.profile.specialty,
  bookableOnline: s.profile.bookableOnline,
  fullName: s.profile.fullName,
  employeeCode: s.profile.employeeCode,
  phone: formatPhone(s.profile.phone),
  email: s.profile.email,
  role: s.role,
  level: s.level,
  skills: s.skillServiceIds,
});

const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

function validate(d: Draft): Errors {
  const errors: Errors = {};
  if (!d.displayName.trim()) errors.displayName = 'Nhập tên hiển thị. Khách thấy tên này khi chọn.';
  if (d.specialty.trim().length > SPECIALTY_MAX) {
    errors.specialty = `Rút xuống còn ${SPECIALTY_MAX} ký tự. Đang có ${d.specialty.trim().length}.`;
  }
  if (!d.fullName.trim()) errors.fullName = 'Nhập họ và tên đầy đủ.';
  if (!normalizePhone(d.phone)) errors.phone = 'Số điện thoại chưa đúng. Ví dụ: 0912 345 678.';
  if (!isEmail(d.email)) errors.email = 'Email chưa đúng. Ví dụ: ten@example.com.';
  return errors;
}

/** Fields that differ from the saved profile; the skills count as one. */
function changedKeys(draft: Draft, saved: Draft) {
  const keys: (keyof Draft)[] = [
    'displayName',
    'title',
    'specialty',
    'bookableOnline',
    'fullName',
    'employeeCode',
    'phone',
    'email',
    'role',
    'level',
  ];
  const changed: string[] = keys.filter((k) => draft[k] !== saved[k]);
  if ([...draft.skills].sort().join() !== [...saved.skills].sort().join()) changed.push('skills');
  return changed;
}

export function StaffProfileScreen({
  tenantSlug,
  staffId,
}: {
  tenantSlug: string;
  staffId: string;
}) {
  const fixture = tenantFixtures.find((f) => f.tenant.slug === tenantSlug) ?? tenantFixtures[0]!;
  const branch = fixture.branches[0]!;
  const router = useRouter();
  const appHref = useAppHref(tenantSlug);
  const toast = useToast();
  const { staff, save } = useStaffStore();
  const member = staff.find((s) => s.resourceId === staffId) ?? staff[0]!;
  const saved = toDraft(member);

  const [draft, setDraft] = useState<Draft>(saved);
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  const [leaveHref, setLeaveHref] = useState<string | null>(null);

  const changes = changedKeys(draft, saved).length;
  useUnsavedGuard(changes > 0, setLeaveHref);

  const errors = validate(draft);
  const shown = (key: keyof Errors) => (submitted || touched.has(key) ? errors[key] : undefined);
  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));
  const touch = (key: string) => setTouched((t) => new Set(t).add(key));
  const invalid = (key: keyof Errors) => (shown(key) ? true : undefined);

  const upcomingFor = (serviceId: string) => {
    const variantIds = new Set(
      fixture.services.find((s) => s.id === serviceId)?.variants.map((v) => v.id),
    );
    return fixture.appointments.filter(
      (a) =>
        a.status === 'confirmed' &&
        a.startAt > MOCK_NOW &&
        a.items.some((i) => i.staffResourceId === staffId && variantIds.has(i.serviceVariantId)),
    ).length;
  };
  const skillHint = (serviceId: string) => {
    const service = fixture.services.find((s) => s.id === serviceId);
    const wait = service?.variants
      .flatMap((v) => v.segments)
      .find((segment) => segment.kind === 'wait');
    const pending = !draft.skills.includes(serviceId) ? upcomingFor(serviceId) : 0;
    return [
      wait &&
        `Gồm đoạn ${wait.label ?? 'chờ'}, ${draft.displayName || 'nhân viên'} được rảnh trong đoạn đó`,
      pending > 0 && `Còn ${pending} lịch sắp tới dùng kỹ năng này; cần đổi người trước khi bỏ`,
    ]
      .filter(Boolean)
      .join('. ');
  };

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    const firstError = (['displayName', 'specialty', 'fullName', 'phone', 'email'] as const).find(
      (key) => errors[key],
    );
    if (firstError) {
      const ids = {
        displayName: 'st-dn',
        specialty: 'st-spec',
        fullName: 'st-full',
        phone: 'st-phone',
        email: 'st-mail',
      };
      document.getElementById(ids[firstError])?.focus();
      return;
    }
    const phone = normalizePhone(draft.phone) ?? member.profile.phone;
    const next: Staff = {
      ...member,
      role: draft.role,
      level: draft.level,
      skillServiceIds: draft.skills,
      profile: {
        ...member.profile,
        displayName: draft.displayName.trim(),
        title: draft.title,
        specialty: draft.specialty.trim(),
        bookableOnline: draft.bookableOnline,
        fullName: draft.fullName.trim(),
        employeeCode: draft.employeeCode.trim(),
        phone,
        email: draft.email.trim(),
      },
    };
    save(next);
    setDraft(toDraft(next));
    setTouched(new Set());
    setSubmitted(false);
    toast({ text: `Đã lưu hồ sơ ${draft.displayName.trim()}.` });
  }

  const discard = () => {
    setDraft(saved);
    setTouched(new Set());
    setSubmitted(false);
  };

  const joined = member.profile.joinedAt;
  const roleHelp = ROLES.find((r) => r.id === draft.role)?.help;
  const name = member.profile.displayName;

  return (
    <>
      <PageHeader
        crumbs={[
          { label: 'Cài đặt', href: appHref('settings') },
          { label: 'Nhân sự', href: appHref('settings/staff') },
          { label: name },
        ]}
        title={name}
        sub={`${member.profile.title} · ${branch.name} · làm từ ${joined.slice(5, 7)}/${joined.slice(0, 4)}`}
        actions={
          <Link
            href={appHref('calendar', { staff: staffId })}
            className="sp-btn sp-btn--secondary no-underline"
          >
            Xem lịch của {name}
          </Link>
        }
      />
      <Form onSubmit={onSubmit}>
        <FormSection
          id="st-s1"
          title="Hồ sơ công khai"
          description="Khách thấy phần này khi chọn người làm ở trang đặt lịch (BR-15)."
        >
          <div className="sp-field--full flex items-center gap-(--space-4)">
            <span
              className="sp-avatar sp-avatar--lg"
              style={{
                background: 'var(--status-checked-in-soft)',
                color: 'var(--status-checked-in)',
              }}
            >
              {(draft.displayName.trim() || name).charAt(0).toUpperCase()}
            </span>
            <div className="flex flex-col gap-1.5">
              <Button
                size="sm"
                className="self-start"
                onClick={() => toast({ text: 'Tải ảnh lên: chưa có trong mock.' })}
              >
                <Upload size={16} aria-hidden="true" />
                Tải ảnh lên
              </Button>
              <span className="sp-field__help">
                JPG hoặc PNG, vuông, tối đa 2 MB. Chưa có ảnh thì hiện chữ cái đầu.
              </span>
            </div>
          </div>
          <Field
            id="st-dn"
            label="Tên hiển thị"
            help="Khách thấy tên này ở trang đặt lịch."
            error={shown('displayName')}
          >
            <input
              id="st-dn"
              type="text"
              value={draft.displayName}
              aria-invalid={invalid('displayName')}
              aria-describedby="st-dn-help"
              onChange={(e) => set({ displayName: e.target.value })}
              onBlur={() => touch('displayName')}
            />
          </Field>
          <Field id="st-title" label="Chức danh">
            <select
              id="st-title"
              value={draft.title}
              onChange={(e) => set({ title: e.target.value })}
            >
              {fixture.staffTitles.map((title) => (
                <option key={title}>{title}</option>
              ))}
            </select>
          </Field>
          <Field
            id="st-spec"
            label="Thế mạnh"
            optional
            full
            help={`Tối đa ${SPECIALTY_MAX} ký tự, hiện dưới tên khi khách chọn.`}
            error={shown('specialty')}
          >
            <input
              id="st-spec"
              type="text"
              value={draft.specialty}
              aria-invalid={invalid('specialty')}
              aria-describedby="st-spec-help"
              onChange={(e) => set({ specialty: e.target.value })}
              onBlur={() => touch('specialty')}
            />
          </Field>
          <SwitchRow
            label="Nhận đặt lịch online"
            hint={`Tắt thì khách không chọn được ${draft.displayName.trim() || name}, lễ tân vẫn xếp được.`}
            checked={draft.bookableOnline}
            onChange={(bookableOnline) => set({ bookableOnline })}
          />
        </FormSection>

        <FormSection
          id="st-s2"
          title="Thông tin nội bộ"
          description="Chỉ hiện trong khu quản trị. Khách không bao giờ thấy họ tên đầy đủ, mã và số điện thoại."
        >
          <Field id="st-full" label="Họ và tên" error={shown('fullName')}>
            <input
              id="st-full"
              type="text"
              value={draft.fullName}
              aria-invalid={invalid('fullName')}
              aria-describedby="st-full-help"
              onChange={(e) => set({ fullName: e.target.value })}
              onBlur={() => touch('fullName')}
            />
          </Field>
          <Field id="st-code" label="Mã nhân viên">
            <input
              id="st-code"
              type="text"
              value={draft.employeeCode}
              onChange={(e) => set({ employeeCode: e.target.value })}
            />
          </Field>
          <Field id="st-phone" label="Số điện thoại" error={shown('phone')}>
            <input
              id="st-phone"
              type="tel"
              inputMode="tel"
              value={draft.phone}
              aria-invalid={invalid('phone')}
              aria-describedby="st-phone-help"
              onChange={(e) => set({ phone: e.target.value })}
              onBlur={() => touch('phone')}
            />
          </Field>
          <Field
            id="st-mail"
            label="Email đăng nhập"
            help="Dùng để đăng nhập và nhận lịch làm."
            error={shown('email')}
          >
            <input
              id="st-mail"
              type="email"
              value={draft.email}
              aria-invalid={invalid('email')}
              aria-describedby="st-mail-help"
              onChange={(e) => set({ email: e.target.value })}
              onBlur={() => touch('email')}
            />
          </Field>
        </FormSection>

        <FormSection
          id="st-s3"
          title="Vai trò"
          description={`Quyết định ${name} thấy những trang nào.`}
        >
          <Field id="st-role" label="Vai trò" help={roleHelp}>
            <select
              id="st-role"
              value={draft.role}
              aria-describedby="st-role-help"
              onChange={(e) => set({ role: e.target.value as StaffRoleId })}
            >
              {ROLES.map((r) => (
                <option key={r.id} value={r.id}>
                  {roleLabel(r.id)}
                </option>
              ))}
            </select>
          </Field>
          <Field id="st-branch" label="Chi nhánh làm việc">
            <select id="st-branch" defaultValue={branch.id}>
              {fixture.branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </Field>
        </FormSection>

        <FormSection
          id="st-s4"
          title="Cấp và kỹ năng"
          description="Chỉ được xếp cho dịch vụ có trong kỹ năng (BR-03)."
        >
          <Field id="st-level" label="Cấp" full help="Dịch vụ có giá theo cấp lấy giá của cấp này.">
            <select
              id="st-level"
              value={draft.level}
              aria-describedby="st-level-help"
              onChange={(e) => set({ level: Number(e.target.value) })}
            >
              {fixture.staffLevels.map((level, i) => (
                <option key={level} value={i + 1}>
                  Cấp {i + 1} · {level}
                </option>
              ))}
            </select>
          </Field>
          {fixture.services.map((service) => (
            <CheckRow
              key={service.id}
              label={service.name}
              hint={skillHint(service.id) || undefined}
              checked={draft.skills.includes(service.id)}
              onChange={(on) =>
                set({
                  skills: on
                    ? [...draft.skills, service.id]
                    : draft.skills.filter((id) => id !== service.id),
                })
              }
            />
          ))}
        </FormSection>

        <SaveBar count={changes} onDiscard={discard} />
      </Form>

      <ConfirmDialog
        open={leaveHref !== null}
        title="Rời trang này?"
        body={`Còn ${changes} thay đổi chưa lưu. Rời đi thì các thay đổi đó mất.`}
        confirmLabel="Rời trang"
        tone="danger"
        onClose={() => setLeaveHref(null)}
        onConfirm={() => {
          const href = leaveHref;
          setLeaveHref(null);
          if (href) router.push(href);
        }}
      />
    </>
  );
}
