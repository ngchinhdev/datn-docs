import { notFound } from 'next/navigation';
import { fixtureBySlug } from '@/mock/selection';
import { BranchDetail } from './branch-detail';

export default async function BranchPage({
  params,
}: PageProps<'/mock/app/[tenant]/settings/branches/[id]'>) {
  const { tenant, id } = await params;
  if (!fixtureBySlug(tenant)) notFound();
  return <BranchDetail key={`${tenant}-${id}`} tenantSlug={tenant} id={id} />;
}
