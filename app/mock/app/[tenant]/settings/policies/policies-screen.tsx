'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { useScheduleStore } from '@/components/mock/schedule-store';
import { useAppHref } from '@/components/mock/use-app-href';
import { ConfirmDialog } from '@/components/sapio/confirm-dialog';
import { Field, Form, FormSection, SaveBar, SwitchRow } from '@/components/sapio/form';
import { PageHeader } from '@/components/sapio/page-header';
import { useToast } from '@/components/sapio/toast';
import { useUnsavedGuard } from '@/components/sapio/use-unsaved-guard';
import type { TemplatePolicies } from '@/mock/fixtures';
import { POLICY_FIELDS } from '@/mock/template-view';

type FormValues = Record<keyof TemplatePolicies, string>;

const toForm = (p: TemplatePolicies): FormValues =>
  Object.fromEntries(POLICY_FIELDS.map((f) => [f.key, String(p[f.key])])) as FormValues;

/** Booking days and the number of no-shows cannot be 0: a shop that never opens or never asks for a deposit has no such rule. */
const MIN: Partial<Record<keyof TemplatePolicies, number>> = {
  maxAdvanceDays: 1,
  noShowAfterMinutes: 1,
  depositAfterNoShows: 1,
};

const valid = (key: keyof TemplatePolicies, text: string) =>
  /^\d{1,4}$/.test(text.trim()) && Number(text) >= (MIN[key] ?? 0);

/** Chính sách (MH-49): the booking rules the customer pages read (BR-06 to BR-10), and what technicians see (BR-36). */
export function PoliciesScreen({ tenantSlug }: { tenantSlug: string }) {
  const router = useRouter();
  const appHref = useAppHref(tenantSlug);
  const toast = useToast();
  const { staffSeesCustomerPhone, setStaffSeesCustomerPhone, policies, setPolicies } =
    useScheduleStore();
  const [phone, setPhone] = useState(staffSeesCustomerPhone);
  const [form, setForm] = useState<FormValues>(() => toForm(policies));
  const [submitted, setSubmitted] = useState(false);
  const [leaveHref, setLeaveHref] = useState<string | null>(null);
  const saved = toForm(policies);
  const policyChanges = POLICY_FIELDS.filter((f) => form[f.key] !== saved[f.key]).length;
  const changes = policyChanges + (phone === staffSeesCustomerPhone ? 0 : 1);
  const firstBad = POLICY_FIELDS.find((f) => !valid(f.key, form[f.key]));
  useUnsavedGuard(changes > 0, setLeaveHref);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (firstBad) {
      document.getElementById(`po-${firstBad.key}`)?.focus();
      return;
    }
    setPolicies(
      Object.fromEntries(
        POLICY_FIELDS.map((f) => [f.key, Number(form[f.key])]),
      ) as unknown as TemplatePolicies,
    );
    setStaffSeesCustomerPhone(phone);
    setSubmitted(false);
    toast({ text: 'Đã lưu. Trang đặt lịch của khách dùng các giá trị này ngay.' });
  }

  function discard() {
    setForm(toForm(policies));
    setPhone(staffSeesCustomerPhone);
    setSubmitted(false);
  }

  return (
    <>
      <PageHeader
        crumbs={[{ label: 'Cài đặt', href: appHref('settings') }, { label: 'Chính sách' }]}
        title="Chính sách"
        sub="Các tham số đặt lịch (BR-06 đến BR-10) và những gì kỹ thuật viên thấy."
      />
      <Form onSubmit={onSubmit}>
        <FormSection
          id="po-booking"
          title="Đặt lịch"
          description="Trang đặt lịch của khách, email nhắc và các màn lịch hẹn của khách đọc những giá trị này."
        >
          {POLICY_FIELDS.map((field) => {
            const bad = submitted && !valid(field.key, form[field.key]);
            return (
              <Field
                key={field.key}
                id={`po-${field.key}`}
                label={field.label}
                suffix={field.unit}
                help={field.rule}
                error={bad ? `Nhập số nguyên từ ${MIN[field.key] ?? 0} trở lên.` : undefined}
              >
                <input
                  id={`po-${field.key}`}
                  type="text"
                  inputMode="numeric"
                  value={form[field.key]}
                  aria-invalid={bad ? true : undefined}
                  aria-describedby={`po-${field.key}-help`}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, [field.key]: e.target.value.replace(/\D/g, '') }))
                  }
                />
              </Field>
            );
          })}
        </FormSection>
        <FormSection
          id="po-staff"
          title="Kỹ thuật viên"
          description="Kỹ thuật viên chỉ thấy lịch của mình, kể cả đoạn chuẩn bị (BR-36)."
        >
          <SwitchRow
            label="Kỹ thuật viên thấy số điện thoại khách"
            hint="Tắt: số điện thoại ẩn trên lịch của kỹ thuật viên; cần liên hệ khách thì nhờ lễ tân."
            checked={phone}
            onChange={setPhone}
          />
        </FormSection>
        <SaveBar count={changes} onDiscard={discard} />
      </Form>
      <ConfirmDialog
        open={leaveHref !== null}
        title="Rời trang này?"
        body={`Còn ${changes} thay đổi chưa lưu. Rời đi thì ${changes === 1 ? 'thay đổi đó' : 'các thay đổi đó'} mất.`}
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
