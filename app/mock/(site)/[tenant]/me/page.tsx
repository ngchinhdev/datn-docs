import { AppointmentsScreen } from './appointments-screen';

export default async function MePage({ params }: PageProps<'/mock/[tenant]/me'>) {
  const { tenant } = await params;
  return <AppointmentsScreen tenantSlug={tenant} />;
}
