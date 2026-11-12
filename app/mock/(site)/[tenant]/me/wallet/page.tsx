import { WalletScreen } from './wallet-screen';

export default async function WalletPage({ params }: PageProps<'/mock/[tenant]/me/wallet'>) {
  const { tenant } = await params;
  return <WalletScreen tenantSlug={tenant} />;
}
