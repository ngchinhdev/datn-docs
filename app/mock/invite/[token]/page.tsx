import type { Metadata } from 'next';
import { InviteScreen } from './invite-screen';

export const metadata: Metadata = {
  title: 'Nhận lời mời · Sapio',
};

export default async function InvitePage({ params }: PageProps<'/mock/invite/[token]'>) {
  const { token } = await params;
  return <InviteScreen token={token} />;
}
