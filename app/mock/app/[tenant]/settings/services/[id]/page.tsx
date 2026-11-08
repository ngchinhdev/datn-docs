import { notFound } from 'next/navigation';
import { fixtureBySlug } from '@/mock/selection';
import { ServiceDetailScreen } from './service-detail-screen';

export default async function ServiceDetailPage({
  params,
}: PageProps<'/mock/app/[tenant]/settings/services/[id]'>) {
  const { tenant, id } = await params;
  const fixture = fixtureBySlug(tenant);
  if (!fixture?.services.some((s) => s.id === id)) notFound();
  return <ServiceDetailScreen key={`${tenant}-${id}`} tenantSlug={tenant} serviceId={id} />;
}
