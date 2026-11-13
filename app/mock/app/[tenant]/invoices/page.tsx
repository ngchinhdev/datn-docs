import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { fixtureBySlug } from '@/mock/selection';
import { InvoicesScreen } from './invoices-screen';

export default async function InvoicesPage({ params }: PageProps<'/mock/app/[tenant]/invoices'>) {
  const { tenant } = await params;
  const fixture = fixtureBySlug(tenant);
  if (!fixture) notFound();
  return (
    <Suspense fallback={null}>
      <InvoicesScreen key={fixture.tenant.slug} tenantSlug={fixture.tenant.slug} />
    </Suspense>
  );
}
