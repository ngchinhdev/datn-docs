import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { NotBuilt } from '@/components/mock/not-built';
import { screenForAppPath } from '@/mock/screens';
import { fixtureBySlug } from '@/mock/selection';
import { OverviewScreen } from '../overview-screen';

/**
 * `/app/[tenant]` is Tổng quan. Sidebar entries whose screen is not built yet land here instead of
 * a 404.
 */
export default async function NotBuiltPage({
  params,
}: PageProps<'/mock/app/[tenant]/[[...rest]]'>) {
  const { tenant, rest = [] } = await params;
  if (!fixtureBySlug(tenant)) notFound();
  if (rest.length === 0) {
    return (
      <Suspense fallback={null}>
        <OverviewScreen tenantSlug={tenant} />
      </Suspense>
    );
  }
  return (
    <div className="sp-shell__content">
      <NotBuilt screen={screenForAppPath(rest)} path={`/${rest.join('/')}`} />
    </div>
  );
}
