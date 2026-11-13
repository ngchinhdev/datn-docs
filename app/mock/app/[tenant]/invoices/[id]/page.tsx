import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { fixtureBySlug } from '@/mock/selection';
import { InvoiceDetail } from './invoice-detail';

export default async function InvoicePage({
  params,
}: PageProps<'/mock/app/[tenant]/invoices/[id]'>) {
  const { tenant, id } = await params;
  const fixture = fixtureBySlug(tenant);
  if (!fixture) notFound();
  return (
    <Suspense fallback={null}>
      <InvoiceDetail
        key={`${fixture.tenant.slug}-${id}`}
        tenantSlug={fixture.tenant.slug}
        id={id}
      />
    </Suspense>
  );
}
