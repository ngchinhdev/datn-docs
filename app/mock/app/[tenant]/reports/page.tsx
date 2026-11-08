import { notFound } from 'next/navigation';
import { GatedPage } from '@/components/mock/locked-feature';
import { fixtureBySlug } from '@/mock/selection';

/** Not built yet; the plan decides whether it shows "Chưa làm" or the page that explains the lock. */
export default async function Page({ params }: PageProps<'/mock/app/[tenant]/reports'>) {
  const { tenant } = await params;
  if (!fixtureBySlug(tenant)) notFound();
  return (
    <GatedPage feature="full_reports" tenantSlug={tenant} path={['reports']} inSettings={false} />
  );
}
