import { notFound } from 'next/navigation';
import { fixtureBySlug } from '@/mock/selection';
import { TimeOffCaseScreen } from './time-off-case-screen';

export default async function TimeOffCasePage({
  params,
}: PageProps<'/mock/app/[tenant]/time-off/[id]'>) {
  const { tenant, id } = await params;
  if (!fixtureBySlug(tenant)) notFound();
  return <TimeOffCaseScreen tenantSlug={tenant} id={id} />;
}
