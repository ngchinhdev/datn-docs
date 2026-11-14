import { TenantDetailScreen } from './tenant-detail-screen';

export default async function AdminTenantPage({ params }: PageProps<'/mock/admin/tenants/[id]'>) {
  const { id } = await params;
  return <TenantDetailScreen tenantId={id} />;
}
