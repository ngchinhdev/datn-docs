'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { useScheduleStore } from '@/components/mock/schedule-store';
import { useAppHref } from '@/components/mock/use-app-href';
import { ConfirmDialog } from '@/components/sapio/confirm-dialog';
import { Form, FormSection, SaveBar, SwitchRow } from '@/components/sapio/form';
import { PageHeader } from '@/components/sapio/page-header';
import { useToast } from '@/components/sapio/toast';
import { useUnsavedGuard } from '@/components/sapio/use-unsaved-guard';

/** Chính sách (MH-49): so far the one setting the technician screens read (BR-36). */
export function PoliciesScreen({ tenantSlug }: { tenantSlug: string }) {
  const router = useRouter();
  const appHref = useAppHref(tenantSlug);
  const toast = useToast();
  const { staffSeesCustomerPhone, setStaffSeesCustomerPhone } = useScheduleStore();
  const [phone, setPhone] = useState(staffSeesCustomerPhone);
  const [leaveHref, setLeaveHref] = useState<string | null>(null);
  const changes = phone === staffSeesCustomerPhone ? 0 : 1;
  useUnsavedGuard(changes > 0, setLeaveHref);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setStaffSeesCustomerPhone(phone);
    toast({
      text: phone
        ? 'Đã lưu. Kỹ thuật viên thấy số điện thoại khách.'
        : 'Đã lưu. Số điện thoại khách ẩn với kỹ thuật viên.',
    });
  }

  return (
    <>
      <PageHeader
        crumbs={[{ label: 'Cài đặt', href: appHref('settings') }, { label: 'Chính sách' }]}
        title="Chính sách"
        sub="Các tham số đặt lịch (BR-06 đến BR-10) chưa có trong mock."
      />
      <Form onSubmit={onSubmit}>
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
        <SaveBar count={changes} onDiscard={() => setPhone(staffSeesCustomerPhone)} />
      </Form>
      <ConfirmDialog
        open={leaveHref !== null}
        title="Rời trang này?"
        body="Còn 1 thay đổi chưa lưu. Rời đi thì thay đổi đó mất."
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
