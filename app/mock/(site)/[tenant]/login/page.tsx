import { notFound } from 'next/navigation';
import { tenantFixtures } from '@/mock/fixtures';
import { fixtureBySlug } from '@/mock/selection';
import { LoginScreen } from './login-screen';

export const dynamicParams = false;

export function generateStaticParams() {
  return tenantFixtures.map((f) => ({ tenant: f.tenant.slug }));
}

export default async function LoginPage({ params }: PageProps<'/mock/[tenant]/login'>) {
  const { tenant } = await params;
  if (!fixtureBySlug(tenant)) notFound();
  return <LoginScreen tenantSlug={tenant} />;
}
