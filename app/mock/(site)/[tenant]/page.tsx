import { notFound } from 'next/navigation';
import { tenantFixtures } from '@/mock/fixtures';
import { fixtureBySlug } from '@/mock/selection';
import { TenantScreen } from './tenant-screen';

export const dynamicParams = false;

export function generateStaticParams() {
  return tenantFixtures.map((f) => ({ tenant: f.tenant.slug }));
}

export default async function TenantPage({ params }: PageProps<'/mock/[tenant]'>) {
  const { tenant } = await params;
  const fixture = fixtureBySlug(tenant);
  if (!fixture) notFound();

  return <TenantScreen tenantSlug={tenant} />;
}
