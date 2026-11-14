import { notFound } from 'next/navigation';
import { fixtureBySlug } from '@/mock/selection';
import { ChatbotScreen } from './chatbot-screen';

export default async function Page({ params }: PageProps<'/mock/app/[tenant]/settings/chatbot'>) {
  const { tenant } = await params;
  if (!fixtureBySlug(tenant)) notFound();
  return <ChatbotScreen tenantSlug={tenant} />;
}
