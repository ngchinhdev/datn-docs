import { notFound } from 'next/navigation';
import { fixtureBySlug } from '@/mock/selection';
import { NotificationsScreen } from './notifications-screen';

export default async function NotificationsPage({
  params,
}: PageProps<'/mock/app/[tenant]/settings/notifications'>) {
  const { tenant } = await params;
  if (!fixtureBySlug(tenant)) notFound();
  return <NotificationsScreen tenantSlug={tenant} />;
}
