import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { fixtureBySlug } from '@/mock/selection';
import { ReportsScreen } from './reports-screen';

export default async function Page({ params }: PageProps<'/mock/app/[tenant]/reports'>) {
  const { tenant } = await params;
  if (!fixtureBySlug(tenant)) notFound();
  return (
    <Suspense fallback={null}>
      <ReportsScreen tenantSlug={tenant} />
    </Suspense>
  );
}
