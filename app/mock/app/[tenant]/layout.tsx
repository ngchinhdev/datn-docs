import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { tenantFixtures } from '@/mock/fixtures';
import { fixtureBySlug } from '@/mock/selection';
import { StaffStoreProvider } from '@/components/mock/staff-store';
import { SubscriptionProvider } from '@/components/mock/subscription-store';
import { AppFrame } from './app-frame';

export function generateStaticParams() {
  return tenantFixtures.map((f) => ({ tenant: f.tenant.slug }));
}

export default async function AppLayout({ children, params }: LayoutProps<'/mock/app/[tenant]'>) {
  const { tenant } = await params;
  // Checked here, before the page streams, so an unknown slug answers 404.
  if (!fixtureBySlug(tenant)) notFound();
  // The frame reads the query string (role, branch), which is only known in the browser.
  return (
    <Suspense fallback={null}>
      <StaffStoreProvider tenantSlug={tenant}>
        <SubscriptionProvider tenantSlug={tenant}>
          <AppFrame tenantSlug={tenant}>{children}</AppFrame>
        </SubscriptionProvider>
      </StaffStoreProvider>
    </Suspense>
  );
}
