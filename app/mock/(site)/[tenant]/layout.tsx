import { notFound } from 'next/navigation';
import { tenantFixtures } from '@/mock/fixtures';
import { fixtureBySlug } from '@/mock/selection';
import { ScheduleStoreProvider } from '@/components/mock/schedule-store';
import { CustomerSessionProvider } from '@/components/mock/customer-session';
import { BookingDraftProvider } from '@/components/mock/booking-draft';
import { ServiceStoreProvider } from '@/components/mock/service-store';
import { StaffStoreProvider } from '@/components/mock/staff-store';

export function generateStaticParams() {
  return tenantFixtures.map((f) => ({ tenant: f.tenant.slug }));
}

export default async function CustomerTenantLayout({
  children,
  params,
}: LayoutProps<'/mock/[tenant]'>) {
  const { tenant } = await params;
  if (!fixtureBySlug(tenant)) notFound();

  return (
    <StaffStoreProvider tenantSlug={tenant}>
      <ServiceStoreProvider tenantSlug={tenant}>
        <ScheduleStoreProvider tenantSlug={tenant}>
          <CustomerSessionProvider tenantSlug={tenant}>
            <BookingDraftProvider>{children}</BookingDraftProvider>
          </CustomerSessionProvider>
        </ScheduleStoreProvider>
      </ServiceStoreProvider>
    </StaffStoreProvider>
  );
}
