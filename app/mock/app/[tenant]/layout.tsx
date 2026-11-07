import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { tenantFixtures } from '@/mock/fixtures';
import { fixtureBySlug } from '@/mock/selection';

export function generateStaticParams() {
  return tenantFixtures.map((f) => ({ tenant: f.tenant.slug }));
}

export default async function AppLayout({ children, params }: LayoutProps<'/mock/app/[tenant]'>) {
  const { tenant } = await params;
  // Checked here, before the page streams, so an unknown slug answers 404.
  if (!fixtureBySlug(tenant)) notFound();
  // Pages read the query string (role, view, date), which is only known in the browser.
  return <Suspense fallback={null}>{children}</Suspense>;
}
