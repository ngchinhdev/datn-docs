import { ServiceListScreen } from './service-list-screen';

export default async function ServicesPage({
  params,
}: PageProps<'/mock/app/[tenant]/settings/services'>) {
  const { tenant } = await params;
  return <ServiceListScreen tenantSlug={tenant} />;
}
