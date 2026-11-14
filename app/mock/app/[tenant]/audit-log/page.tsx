import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { fixtureBySlug } from '@/mock/selection';
import { AuditLogScreen } from './audit-log-screen';

export default async function AuditLogPage({ params }: PageProps<'/mock/app/[tenant]/audit-log'>) {
  const { tenant } = await params;
  if (!fixtureBySlug(tenant)) notFound();
  return (
    <Suspense fallback={null}>
      <AuditLogScreen tenantSlug={tenant} />
    </Suspense>
  );
}
