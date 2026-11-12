import { AppointmentDetail } from './appointment-detail';

export default async function MeAppointmentPage({
  params,
}: PageProps<'/mock/[tenant]/me/appointments/[id]'>) {
  const { tenant, id } = await params;
  return <AppointmentDetail tenantSlug={tenant} id={id} />;
}
