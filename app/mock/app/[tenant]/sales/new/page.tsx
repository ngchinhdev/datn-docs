import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { fixtureBySlug } from '@/mock/selection';
import { SalesScreen } from './sales-screen';

export default async function SalesNewPage({ params }: PageProps<'/mock/app/[tenant]/sales/new'>) {
  const { tenant } = await params;
  const fixture = fixtureBySlug(tenant);
  if (!fixture) notFound();
  return (
    <Suspense fallback={null}>
      <SalesScreen key={fixture.tenant.slug} tenantSlug={fixture.tenant.slug} />
    </Suspense>
  );
}
