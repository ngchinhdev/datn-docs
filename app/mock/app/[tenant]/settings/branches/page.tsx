import { notFound } from 'next/navigation';
import { fixtureBySlug } from '@/mock/selection';
import { BranchesScreen } from './branches-screen';

export default async function BranchesPage({
  params,
}: PageProps<'/mock/app/[tenant]/settings/branches'>) {
  const { tenant } = await params;
  if (!fixtureBySlug(tenant)) notFound();
  return <BranchesScreen tenantSlug={tenant} />;
}
