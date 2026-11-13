import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { fixtureBySlug } from '@/mock/selection';
import { RefundsScreen } from './refunds-screen';

export default async function RefundsPage({ params }: PageProps<'/mock/app/[tenant]/refunds'>) {
  const { tenant } = await params;
  const fixture = fixtureBySlug(tenant);
  if (!fixture) notFound();
  return (
    <Suspense fallback={null}>
      <RefundsScreen key={fixture.tenant.slug} tenantSlug={fixture.tenant.slug} />
    </Suspense>
  );
}
