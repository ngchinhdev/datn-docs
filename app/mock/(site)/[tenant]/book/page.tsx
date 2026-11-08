import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { tenantFixtures } from '@/mock/fixtures';
import { fixtureBySlug } from '@/mock/selection';
import { BookingGate } from './booking-gate';

export const dynamicParams = false;

export function generateStaticParams() {
  return tenantFixtures.map((f) => ({ tenant: f.tenant.slug }));
}

export default async function BookingPage({
  params,
  searchParams,
}: PageProps<'/mock/[tenant]/book'>) {
  const { tenant } = await params;
  const query = await searchParams;
  const fixture = fixtureBySlug(tenant);
  if (!fixture) notFound();
  const newCustomer = query.khach === 'moi';
  // Keyed so switching tenant or customer restarts the flow.
  return (
    <Suspense fallback={null}>
      <BookingGate
        key={`${fixture.tenant.slug}-${newCustomer}`}
        tenantSlug={fixture.tenant.slug}
        newCustomer={newCustomer}
      />
    </Suspense>
  );
}
