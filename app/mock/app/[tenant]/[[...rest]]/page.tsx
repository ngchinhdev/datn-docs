import { notFound } from 'next/navigation';
import { NotBuilt } from '@/components/mock/not-built';
import { screenForAppPath } from '@/mock/screens';
import { fixtureBySlug } from '@/mock/selection';

/** Sidebar entries whose screen is not built yet land here instead of a 404. */
export default async function NotBuiltPage({
  params,
}: PageProps<'/mock/app/[tenant]/[[...rest]]'>) {
  const { tenant, rest = [] } = await params;
  if (!fixtureBySlug(tenant)) notFound();
  return (
    <div className="sp-shell__content">
      <NotBuilt screen={screenForAppPath(rest)} path={`/${rest.join('/')}`} />
    </div>
  );
}
