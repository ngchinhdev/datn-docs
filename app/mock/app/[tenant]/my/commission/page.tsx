import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { fixtureBySlug } from '@/mock/selection';
import { MyCommissionScreen } from './my-commission-screen';

export default async function MyCommissionPage({
  params,
}: PageProps<'/mock/app/[tenant]/my/commission'>) {
  const { tenant } = await params;
  if (!fixtureBySlug(tenant)) notFound();
  return (
    <Suspense fallback={null}>
      <MyCommissionScreen tenantSlug={tenant} />
    </Suspense>
  );
}
