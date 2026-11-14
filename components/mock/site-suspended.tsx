'use client';

import { Phone } from 'lucide-react';
import Link from 'next/link';
import { Suspense, type ReactNode } from 'react';
import { useAccountStore, workspaceBySlug } from '@/components/mock/account-store';
import { useTenantSubscription } from '@/components/mock/platform-store';
import { useLiveFixture } from '@/components/mock/use-live-fixture';
import { branchPhone, siteHost } from '@/mock/site';
import { entitlements } from '@/mock/subscription';
import { MOCK_NOW } from '@/mock/time';

/**
 * Whether the booking page takes no new booking: the platform locked the tenant (BR-75), or the
 * plan ended (BR-82). Customers see the same page for both, with no reason.
 */
export function useSiteSuspended(tenantSlug: string): boolean {
  const { locks } = useAccountStore();
  const { subscription, catalog } = useTenantSubscription(tenantSlug);
  const workspace = workspaceBySlug(tenantSlug);
  const mode = entitlements(subscription, MOCK_NOW, catalog).mode;
  return mode === 'expired' || mode === 'locked' || Boolean(workspace && locks[workspace.id]);
}

/** Shows `children` unless the page is suspended; the search params need a boundary of their own. */
export function SuspendedGate({
  tenantSlug,
  children,
}: {
  tenantSlug: string;
  children: ReactNode;
}) {
  return (
    <Suspense fallback={null}>
      <Gate tenantSlug={tenantSlug}>{children}</Gate>
    </Suspense>
  );
}

function Gate({ tenantSlug, children }: { tenantSlug: string; children: ReactNode }) {
  return useSiteSuspended(tenantSlug) ? <SiteSuspended tenantSlug={tenantSlug} /> : children;
}

/** MH-10, customer side: the booking page is paused; bookings already made can still be seen and cancelled. */
export function SiteSuspended({ tenantSlug }: { tenantSlug: string }) {
  const fixture = useLiveFixture(tenantSlug);
  const phone = branchPhone(tenantSlug, fixture.branches[0]?.phone);
  const tone = fixture.tenant.slug === 'toc-may' ? 'may' : 'pawpaw';
  return (
    <div className={`sp-tenant-${tone} mx-auto flex w-full max-w-[560px] flex-col text-(--ink)`}>
      <div className="h-[120px] rounded-(--radius-lg) bg-(--accent-soft)" />
      <div className="-mt-8 flex flex-col gap-4 px-5 pb-6">
        <span className="inline-flex size-16 items-center justify-center rounded-full bg-(--surface-raised) text-2xl leading-none font-bold text-(--accent) shadow-(--shadow-card)">
          {fixture.tenant.monogram}
        </span>
        <div>
          <h1 className="m-0 text-2xl leading-8 font-bold">{fixture.tenant.name}</h1>
          <p className="mt-1 mb-0 text-sm leading-5 text-(--ink-muted)">{siteHost(tenantSlug)}</p>
        </div>
        <div
          role="status"
          className="flex gap-2.5 rounded-(--radius-md) bg-(--status-no-show-soft) px-3.5 py-3 text-sm leading-5"
        >
          <div>
            <strong>Trang đặt lịch đang tạm dừng.</strong>
            <br />
            Chưa đặt lịch mới được. Lịch bạn đã đặt vẫn còn; xem hoặc hủy ở &ldquo;Lịch của
            tôi&rdquo;.
          </div>
        </div>
        <Link
          href={`/mock/${tenantSlug}/me`}
          className="sp-btn sp-btn--secondary h-12! no-underline"
        >
          Lịch của tôi
        </Link>
        <a href={`tel:${phone.tel}`} className="sp-btn sp-btn--ghost h-12! no-underline">
          <Phone size={16} aria-hidden="true" />
          Gọi tiệm {phone.display}
        </a>
      </div>
    </div>
  );
}
