import { notFound } from 'next/navigation';
import { fixtureBySlug } from '@/mock/selection';
import { MyScheduleScreen } from './my-schedule-screen';

export default async function MySchedulePage({
  params,
}: PageProps<'/mock/app/[tenant]/my/schedule'>) {
  const { tenant } = await params;
  if (!fixtureBySlug(tenant)) notFound();
  return <MyScheduleScreen tenantSlug={tenant} />;
}
