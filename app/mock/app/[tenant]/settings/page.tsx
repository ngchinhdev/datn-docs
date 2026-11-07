import { SettingsIndex } from './settings-index';

export default async function SettingsPage({ params }: PageProps<'/mock/app/[tenant]/settings'>) {
  const { tenant } = await params;
  return <SettingsIndex tenantSlug={tenant} />;
}
