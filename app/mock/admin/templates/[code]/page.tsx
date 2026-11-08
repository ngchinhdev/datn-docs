import { notFound } from 'next/navigation';
import { industryTemplates } from '@/mock/fixtures/templates';
import { TemplateDetailScreen } from './template-detail-screen';

export default async function TemplateDetailPage({
  params,
}: PageProps<'/mock/admin/templates/[code]'>) {
  const { code } = await params;
  if (!industryTemplates.some((t) => t.id === code)) notFound();
  return <TemplateDetailScreen key={code} code={code} />;
}
