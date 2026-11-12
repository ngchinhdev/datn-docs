import { notFound } from 'next/navigation';
import { tenantFixtures } from '@/mock/fixtures';
import { fixtureBySlug } from '@/mock/selection';
import { ScheduleStoreProvider } from '@/components/mock/schedule-store';
import { CustomerSessionProvider } from '@/components/mock/customer-session';
import { BookingDraftProvider } from '@/components/mock/booking-draft';

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
    <ScheduleStoreProvider tenantSlug={tenant}>
      <CustomerSessionProvider tenantSlug={tenant}>
        <BookingDraftProvider>{children}</BookingDraftProvider>
      </CustomerSessionProvider>
    </ScheduleStoreProvider>
  );
}
