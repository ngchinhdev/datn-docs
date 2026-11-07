import { notFound } from 'next/navigation';
import { fixtureBySlug } from '@/mock/selection';
import { CustomersScreen } from './customers-screen';

export default async function CustomersPage({ params }: PageProps<'/mock/app/[tenant]/customers'>) {
  const { tenant } = await params;
  const fixture = fixtureBySlug(tenant);
  if (!fixture) notFound();
  return <CustomersScreen key={fixture.tenant.slug} tenantSlug={fixture.tenant.slug} />;
}
