import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { fixtureBySlug } from '@/mock/selection';
import { PackagesScreen } from './packages-screen';

export default async function Page({ params }: PageProps<'/mock/app/[tenant]/settings/packages'>) {
  const { tenant } = await params;
  if (!fixtureBySlug(tenant)) notFound();
  return (
    <Suspense fallback={null}>
      <PackagesScreen tenantSlug={tenant} />
    </Suspense>
  );
}
