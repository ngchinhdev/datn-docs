import { notFound } from 'next/navigation';
import { fixtureBySlug } from '@/mock/selection';
import { AppointmentScreen } from './appointment-screen';

export default async function AppointmentPage({
  params,
}: PageProps<'/mock/app/[tenant]/appointments/[id]'>) {
  const { tenant, id } = await params;
  if (!fixtureBySlug(tenant)) notFound();
  return <AppointmentScreen tenantSlug={tenant} id={id} />;
}
