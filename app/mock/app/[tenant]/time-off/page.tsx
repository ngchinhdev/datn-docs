import { notFound } from 'next/navigation';
import { fixtureBySlug } from '@/mock/selection';
import { TimeOffListScreen } from './time-off-list-screen';

export default async function TimeOffPage({ params }: PageProps<'/mock/app/[tenant]/time-off'>) {
  const { tenant } = await params;
  if (!fixtureBySlug(tenant)) notFound();
  return <TimeOffListScreen tenantSlug={tenant} />;
}
