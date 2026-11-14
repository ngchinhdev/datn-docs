import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { fixtureBySlug } from '@/mock/selection';
import { ResourcesScreen } from './resources-screen';

export default async function ResourcesPage({
  params,
}: PageProps<'/mock/app/[tenant]/settings/resources'>) {
  const { tenant } = await params;
  if (!fixtureBySlug(tenant)) notFound();
  return (
    <Suspense fallback={null}>
      <ResourcesScreen tenantSlug={tenant} />
    </Suspense>
  );
}
