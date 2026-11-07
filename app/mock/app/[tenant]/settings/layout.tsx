import { SettingsFrame } from './settings-frame';

export default async function SettingsLayout({
  children,
  params,
}: LayoutProps<'/mock/app/[tenant]/settings'>) {
  const { tenant } = await params;
  return <SettingsFrame tenantSlug={tenant}>{children}</SettingsFrame>;
}
