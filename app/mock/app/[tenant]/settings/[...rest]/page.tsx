import { NotBuilt } from '@/components/mock/not-built';
import { screenForAppPath } from '@/mock/screens';

/** Settings sections that are not built yet keep the settings menu around them. */
export default async function NotBuiltSettingsPage({
  params,
}: PageProps<'/mock/app/[tenant]/settings/[...rest]'>) {
  const { rest } = await params;
  const path = ['settings', ...rest];
  return <NotBuilt screen={screenForAppPath(path)} path={`/${path.join('/')}`} />;
}
