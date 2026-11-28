'use client';

import { Eye, Info } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Notice } from '@/components/mock/password-field';
import { useAppHref } from '@/components/mock/use-app-href';
import { Button } from '@/components/sapio/button';
import { ConfirmDialog } from '@/components/sapio/confirm-dialog';
import { DetailLayout } from '@/components/sapio/detail-layout';
import { SaveBar } from '@/components/sapio/form';
import { PageHeader } from '@/components/sapio/page-header';
import { useMediaQuery } from '@/components/sapio/use-media-query';
import { useUnsavedGuard } from '@/components/sapio/use-unsaved-guard';
import {
  GeneralSection,
  PricingSection,
  SegmentsSection,
  VariantsSection,
  WhoSection,
} from './service-sections';
import { ServicePhone } from './service-phone';
import { ServiceSide } from './service-side';
import { useServiceEditor } from './use-service-editor';

/** Cài đặt › Dịch vụ › one service (MH-45): variants, segments on a timeline, prices, who does it. */
export function ServiceDetailScreen({
  tenantSlug,
  serviceId,
}: {
  tenantSlug: string;
  serviceId: string;
}) {
  const ed = useServiceEditor(tenantSlug, serviceId);
  const { draft, saved, changes, readOnly } = ed;
  const router = useRouter();
  const appHref = useAppHref(tenantSlug);
  const wide = useMediaQuery('(min-width: 768px)');
  const [leaveHref, setLeaveHref] = useState<string | null>(null);
  const [archiving, setArchiving] = useState(false);
  useUnsavedGuard(changes > 0, setLeaveHref);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    ed.submit();
  }

  const note = ed.blocked ? (
    'Còn lỗi cần sửa trước khi lưu.'
  ) : (
    <>{ed.upcoming} lịch đã đặt giữ thời gian và giá cũ (BR-12)</>
  );

  /** The sections stay read only while the service is out of use (BR-94.14). */
  const fields = (children: React.ReactNode) => (
    <fieldset disabled={readOnly} className="m-0 contents border-0 p-0">
      {children}
    </fieldset>
  );

  const sections = (
    <>
      <GeneralSection ed={ed} />
      <VariantsSection ed={ed} />
      {wide ? (
        <>
          <SegmentsSection ed={ed} />
          <PricingSection ed={ed} />
        </>
      ) : null}
    </>
  );

  return (
    <>
      <PageHeader
        hideCrumbsOnPhone
        crumbs={[
          { label: 'Cài đặt', href: appHref('settings') },
          { label: 'Dịch vụ', href: appHref('settings/services') },
          { label: saved.name },
        ]}
        title={saved.name}
        sub={`${draft.variants.length} biến thể · ${ed.capable.length} người làm được${
          readOnly ? ' · Đã ngừng dùng' : ''
        }`}
        actions={
          <>
            <label className="sp-switch gap-3">
              <span>Nhận đặt online</span>
              <input
                type="checkbox"
                role="switch"
                checked={draft.bookableOnline}
                disabled={readOnly}
                onChange={(e) => ed.patchService({ bookableOnline: e.target.checked })}
              />
            </label>
            <Link
              href={`/mock/${tenantSlug}/book?service=${saved.id}`}
              className="sp-btn sp-btn--secondary no-underline"
            >
              <Eye size={16} aria-hidden="true" />
              Xem như khách
            </Link>
            {!readOnly && <Button onClick={() => setArchiving(true)}>Ngừng dùng</Button>}
          </>
        }
      />
      {readOnly && (
        <Notice tone="note" role="status" icon={<Info size={18} aria-hidden="true" />}>
          <span className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span>Dịch vụ đã ngừng dùng. Bạn chỉ xem được. Dùng lại để sửa.</span>
            <Button size="sm" onClick={ed.restore}>
              Dùng lại
            </Button>
          </span>
          {ed.restoreTaken && (
            <span role="alert" className="mt-2 block text-(--danger)">
              Đã có dịch vụ đang dùng tên này. Đổi tên một trong hai dịch vụ rồi dùng lại.
            </span>
          )}
        </Notice>
      )}
      {wide ? (
        <DetailLayout
          sideLabel="Xem trước"
          onSubmit={onSubmit}
          main={
            <>
              {fields(
                <>
                  {sections}
                  <WhoSection ed={ed} />
                </>,
              )}
              <SaveBar
                count={changes}
                onDiscard={ed.discard}
                note={note}
                saveDisabled={ed.blocked}
              />
            </>
          }
          side={<ServiceSide ed={ed} />}
        />
      ) : (
        <form noValidate onSubmit={onSubmit} className="sp-form">
          {fields(
            <>
              <ServicePhone ed={ed} />
              <GeneralSection ed={ed} />
              <VariantsSection ed={ed} />
              <WhoSection ed={ed} />
            </>,
          )}
          <SaveBar count={changes} onDiscard={ed.discard} note={note} saveDisabled={ed.blocked} />
        </form>
      )}

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

      <ConfirmDialog
        open={archiving}
        title={`Ngừng dùng ${saved.name}?`}
        body={`Dịch vụ không hiện ở trang khách và lễ tân không chọn được nữa. Biến thể, đoạn và giá giữ nguyên, dùng lại được.${
          changes > 0 ? ' Thay đổi chưa lưu sẽ mất.' : ''
        }`}
        confirmLabel="Ngừng dùng"
        backLabel="Quay lại"
        onClose={() => setArchiving(false)}
        onConfirm={() => {
          setArchiving(false);
          ed.archive();
          router.push(appHref('settings/services'));
        }}
      />
    </>
  );
}
