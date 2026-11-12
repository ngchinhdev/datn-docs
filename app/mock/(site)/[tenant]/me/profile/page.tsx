import { ProfileScreen } from './profile-screen';

export default async function ProfilePage({ params }: PageProps<'/mock/[tenant]/me/profile'>) {
  const { tenant } = await params;
  return <ProfileScreen tenantSlug={tenant} />;
}
