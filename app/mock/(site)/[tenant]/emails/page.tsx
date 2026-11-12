import { notFound } from 'next/navigation';
import { tenantFixtures } from '@/mock/fixtures';
import { fixtureBySlug } from '@/mock/selection';
import { EmailsScreen } from './emails-screen';

export const dynamicParams = false;

export function generateStaticParams() {
  return tenantFixtures.map((f) => ({ tenant: f.tenant.slug }));
}

export default async function EmailsPage({ params }: PageProps<'/mock/[tenant]/emails'>) {
  const { tenant } = await params;
  if (!fixtureBySlug(tenant)) notFound();
  return <EmailsScreen tenantSlug={tenant} />;
}
