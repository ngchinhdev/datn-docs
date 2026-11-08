import { NotBuilt } from '@/components/mock/not-built';
import { screenForAdminPath } from '@/mock/screens';

/** Administration pages that are not built yet keep the administration sidebar around them. */
export default async function NotBuiltAdminPage({ params }: PageProps<'/mock/admin/[[...rest]]'>) {
  const { rest = [] } = await params;
  const path = ['admin', ...rest];
  return (
    <div className="sp-shell__content">
      <NotBuilt screen={screenForAdminPath(rest)} path={`/${path.join('/')}`} />
    </div>
  );
}
