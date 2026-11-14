import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { fixtureBySlug } from '@/mock/selection';
import { CommissionScreen } from './commission-screen';

export default async function Page({ params }: PageProps<'/mock/app/[tenant]/commission'>) {
  const { tenant } = await params;
  if (!fixtureBySlug(tenant)) notFound();
  return (
    <Suspense fallback={null}>
      <CommissionScreen tenantSlug={tenant} />
    </Suspense>
  );
}
