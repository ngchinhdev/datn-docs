import { notFound } from 'next/navigation';
import { fixtureBySlug } from '@/mock/selection';
import { TodayScreen } from './today-screen';

export default async function TodayPage({ params }: PageProps<'/mock/app/[tenant]/today'>) {
  const { tenant } = await params;
  const fixture = fixtureBySlug(tenant);
  if (!fixture) notFound();
  return <TodayScreen key={fixture.tenant.slug} tenantSlug={fixture.tenant.slug} />;
}
