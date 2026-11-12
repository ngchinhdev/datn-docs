import { notFound } from 'next/navigation';
import { tenantFixtures } from '@/mock/fixtures';
import { fixtureBySlug } from '@/mock/selection';
import { PayScreen } from './pay-screen';

export const dynamicParams = false;

export function generateStaticParams() {
  return tenantFixtures.map((f) => ({ tenant: f.tenant.slug }));
}

export default async function PayPage({ params }: PageProps<'/mock/[tenant]/book/pay'>) {
  const { tenant } = await params;
  if (!fixtureBySlug(tenant)) notFound();
  return <PayScreen tenantSlug={tenant} />;
}
