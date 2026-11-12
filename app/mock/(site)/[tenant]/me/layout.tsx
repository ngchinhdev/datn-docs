import { notFound } from 'next/navigation';
import { fixtureBySlug } from '@/mock/selection';
import { MeShell } from './me-shell';

export default async function MeLayout({ children, params }: LayoutProps<'/mock/[tenant]/me'>) {
  const { tenant } = await params;
  if (!fixtureBySlug(tenant)) notFound();
  return <MeShell tenantSlug={tenant}>{children}</MeShell>;
}
