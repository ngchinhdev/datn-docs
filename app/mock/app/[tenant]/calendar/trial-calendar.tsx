'use client';

import { Eye, Plus } from 'lucide-react';
import Link from 'next/link';
import { useStaffStore } from '@/components/mock/staff-store';
import { useAppHref } from '@/components/mock/use-app-href';
import { Button } from '@/components/sapio/button';
import { Checklist, type ChecklistItem } from '@/components/sapio/checklist';
import { PageHeader } from '@/components/sapio/page-header';
import { tenantFixtures } from '@/mock/fixtures';
import { PLAN_TODAY } from '@/mock/subscription';
import { formatDay } from '@/mock/time';

/** "3 ghế, 1 giường": the count of each kind of resource, by the first word of its name. */
function describeResources(counts: Map<string, number>) {
  return [...counts].map(([name, n]) => `${n} ${name.split(' ')[0]!.toLowerCase()}`).join(', ');
}

/**
 * The Lịch page while the tenant is on trial (BR-81): no calendar to book into, but a list of what
 * to prepare, counted from the tenant's data. The shifts and the logo have no data in the mock,
 * so they stay open.
 */
export function TrialCalendar({ tenantSlug }: { tenantSlug: string }) {
  const fixture = tenantFixtures.find((f) => f.tenant.slug === tenantSlug) ?? tenantFixtures[0]!;
  const branch = fixture.branches[0]!;
  const appHref = useAppHref(tenantSlug);
  const { staff } = useStaffStore();

  const services = fixture.services.flatMap((s) => s.variants).length;
  const staffTypeIds = new Set(fixture.resourceTypes.filter((t) => t.isStaff).map((t) => t.id));
  const resourceCounts = new Map<string, number>();
  for (const resource of fixture.resources) {
    if (staffTypeIds.has(resource.resourceTypeId)) continue;
    const type = fixture.resourceTypes.find((t) => t.id === resource.resourceTypeId)?.name ?? '';
    resourceCounts.set(type, (resourceCounts.get(type) ?? 0) + 1);
  }
  const online = staff.filter((s) => s.profile.bookableOnline).length;

  const items: ChecklistItem[] = [
    {
      label: 'Thêm dịch vụ và giá',
      meta: `${services} dịch vụ`,
      done: services > 0,
      href: appHref('settings/services'),
    },
    {
      label: 'Thêm tài nguyên',
      meta: describeResources(resourceCounts),
      done: resourceCounts.size > 0,
      href: appHref('settings/resources'),
    },
    {
      label: `Thêm ${fixture.template.vocabulary.staff.toLowerCase()} nhận đặt online`,
      meta: `${online} người`,
      done: online > 0,
      href: appHref('settings/staff'),
    },
    { label: 'Xếp ca tuần đầu', meta: 'Chưa có ca', done: false, href: appHref('shifts') },
    {
      label: 'Tải logo, chọn màu trang đặt lịch',
      done: false,
      href: appHref('settings/branding'),
    },
  ];

  return (
    <div className="sp-shell__content">
      <PageHeader
        title="Lịch"
        sub={`${formatDay(PLAN_TODAY)}/${PLAN_TODAY.slice(0, 4)} · ${branch.name}`}
        actions={
          <>
            <Link
              href={`/mock/${tenantSlug}/book?plan=trial`}
              className="sp-btn sp-btn--secondary no-underline"
            >
              <Eye size={16} aria-hidden="true" />
              Xem thử trang đặt lịch
            </Link>
            <Button variant="primary" disabled aria-describedby="trial-note">
              <Plus size={16} aria-hidden="true" />
              Tạo lịch hẹn
            </Button>
          </>
        }
      />
      <section
        className="sp-auth__card mx-auto mt-(--space-6) max-w-[640px] gap-(--space-4)!"
        aria-labelledby="trial-title"
      >
        <div className="flex flex-col gap-1">
          <h2 id="trial-title" className="m-0 text-xl leading-7 font-semibold">
            Lịch hẹn mở khi kích hoạt gói
          </h2>
          <p id="trial-note" className="m-0 text-sm leading-5 text-(--ink-muted)">
            Trong 7 ngày dùng thử, khách chưa đặt được lịch và chưa tạo được lịch hẹn. Chuẩn bị
            trước những việc dưới đây để ngày đầu nhận khách suôn sẻ.
          </p>
        </div>
        <Checklist items={items} />
        <div className="flex flex-wrap justify-end gap-(--space-2)">
          <Link href={appHref('settings/plan')} className="sp-btn sp-btn--secondary no-underline">
            Xem gói và giá
          </Link>
          <Link href={appHref('settings/plan')} className="sp-btn sp-btn--primary no-underline">
            Kích hoạt gói
          </Link>
        </div>
      </section>
    </div>
  );
}
