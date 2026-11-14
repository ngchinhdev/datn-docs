import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { fixtureBySlug } from '@/mock/selection';
import { PeriodScreen } from './period-screen';

export default async function Page({
  params,
}: PageProps<'/mock/app/[tenant]/commission/periods/[id]'>) {
  const { tenant, id } = await params;
  if (!fixtureBySlug(tenant)) notFound();
  return (
    <Suspense fallback={null}>
      <PeriodScreen tenantSlug={tenant} periodId={id} />
    </Suspense>
  );
}
