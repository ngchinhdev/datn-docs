'use client';

import { Eye } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { useAppHref } from '@/components/mock/use-app-href';
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
  const { fixture, draft, saved, changes } = ed;
  const branch = fixture.branches[0]!;
  const router = useRouter();
  const appHref = useAppHref(tenantSlug);
  const wide = useMediaQuery('(min-width: 768px)');
  const [leaveHref, setLeaveHref] = useState<string | null>(null);
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
        sub={`${draft.variants.length} biến thể · ${ed.capable.length} người làm được · ${branch.name}`}
        actions={
          <>
            <label className="sp-switch gap-3">
              <span>Nhận đặt online</span>
              <input
                type="checkbox"
                role="switch"
                checked={draft.bookableOnline}
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
          </>
        }
      />
      {wide ? (
        <DetailLayout
          sideLabel="Xem trước"
          onSubmit={onSubmit}
          main={
            <>
              {sections}
              <WhoSection ed={ed} />
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
          <ServicePhone ed={ed} />
          <GeneralSection ed={ed} />
          <VariantsSection ed={ed} />
          <WhoSection ed={ed} />
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
    </>
  );
}
