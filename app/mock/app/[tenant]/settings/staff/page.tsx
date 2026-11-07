import { StaffListScreen } from './staff-list-screen';

export default async function StaffPage({
  params,
}: PageProps<'/mock/app/[tenant]/settings/staff'>) {
  const { tenant } = await params;
  return <StaffListScreen tenantSlug={tenant} />;
}
