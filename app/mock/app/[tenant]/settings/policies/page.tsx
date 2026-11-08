import { notFound } from 'next/navigation';
import { fixtureBySlug } from '@/mock/selection';
import { PoliciesScreen } from './policies-screen';

export default async function PoliciesPage({
  params,
}: PageProps<'/mock/app/[tenant]/settings/policies'>) {
  const { tenant } = await params;
  if (!fixtureBySlug(tenant)) notFound();
  return <PoliciesScreen tenantSlug={tenant} />;
}
