import { notFound } from 'next/navigation';
import { fixtureBySlug } from '@/mock/selection';
import { ShiftsScreen } from './shifts-screen';

export default async function ShiftsPage({ params }: PageProps<'/mock/app/[tenant]/shifts'>) {
  const { tenant } = await params;
  if (!fixtureBySlug(tenant)) notFound();
  return <ShiftsScreen tenantSlug={tenant} />;
}
