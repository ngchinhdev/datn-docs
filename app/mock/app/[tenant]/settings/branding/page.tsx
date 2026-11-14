import { notFound } from 'next/navigation';
import { fixtureBySlug } from '@/mock/selection';
import { BrandingScreen } from './branding-screen';

export default async function BrandingPage({
  params,
}: PageProps<'/mock/app/[tenant]/settings/branding'>) {
  const { tenant } = await params;
  if (!fixtureBySlug(tenant)) notFound();
  return <BrandingScreen tenantSlug={tenant} />;
}
