import { notFound } from 'next/navigation';
import { fixtureBySlug } from '@/mock/selection';
import { PaymentsScreen } from './payments-screen';

export default async function PaymentsPage({
  params,
}: PageProps<'/mock/app/[tenant]/settings/payments'>) {
  const { tenant } = await params;
  if (!fixtureBySlug(tenant)) notFound();
  return <PaymentsScreen tenantSlug={tenant} />;
}
