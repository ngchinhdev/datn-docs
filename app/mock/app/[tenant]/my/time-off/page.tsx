import { notFound } from 'next/navigation';
import { fixtureBySlug } from '@/mock/selection';
import { MyTimeOffScreen } from './my-time-off-screen';

export default async function MyTimeOffPage({
  params,
}: PageProps<'/mock/app/[tenant]/my/time-off'>) {
  const { tenant } = await params;
  if (!fixtureBySlug(tenant)) notFound();
  return <MyTimeOffScreen tenantSlug={tenant} />;
}
