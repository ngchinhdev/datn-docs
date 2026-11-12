import { notFound } from 'next/navigation';
import { fixtureBySlug } from '@/mock/selection';
import { SubjectsScreen } from './subjects-screen';

export default async function SubjectsPage({ params }: PageProps<'/mock/[tenant]/me/subjects'>) {
  const { tenant } = await params;
  // Only industries that serve something other than the customer have this page.
  if (fixtureBySlug(tenant)?.template.vocabulary.subject == null) notFound();
  return <SubjectsScreen tenantSlug={tenant} />;
}
