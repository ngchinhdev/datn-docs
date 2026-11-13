import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { fixtureBySlug } from '@/mock/selection';
import { CustomerProfile } from './customer-profile';

export default async function CustomerPage({
  params,
}: PageProps<'/mock/app/[tenant]/customers/[id]'>) {
  const { tenant, id } = await params;
  const fixture = fixtureBySlug(tenant);
  if (!fixture) notFound();
  return (
    <Suspense fallback={null}>
      <CustomerProfile
        key={`${fixture.tenant.slug}-${id}`}
        tenantSlug={fixture.tenant.slug}
        id={id}
      />
    </Suspense>
  );
}
