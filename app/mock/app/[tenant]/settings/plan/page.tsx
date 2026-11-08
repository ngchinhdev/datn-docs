import { notFound } from 'next/navigation';
import { fixtureBySlug } from '@/mock/selection';
import { PlanScreen } from './plan-screen';

export default async function PlanPage({ params }: PageProps<'/mock/app/[tenant]/settings/plan'>) {
  const { tenant } = await params;
  if (!fixtureBySlug(tenant)) notFound();
  return <PlanScreen tenantSlug={tenant} />;
}
