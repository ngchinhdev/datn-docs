import { notFound } from 'next/navigation';
import { fixtureBySlug } from '@/mock/selection';
import { StaffProfileScreen } from './staff-profile-screen';

export default async function StaffProfilePage({
  params,
}: PageProps<'/mock/app/[tenant]/settings/staff/[id]'>) {
  const { tenant, id } = await params;
  const fixture = fixtureBySlug(tenant);
  if (!fixture?.staff.some((s) => s.resourceId === id)) notFound();
  return <StaffProfileScreen key={`${tenant}-${id}`} tenantSlug={tenant} staffId={id} />;
}
