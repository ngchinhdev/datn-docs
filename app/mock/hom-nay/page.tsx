import { parseSelection } from '@/mock/selection';
import { keepQuery } from '../le-tan/query';
import { TodayScreen } from './today-screen';

export default async function TodayPage({ searchParams }: PageProps<'/mock/hom-nay'>) {
  const params = await searchParams;
  const { fixture } = parseSelection(params.tenant, params.role);
  return (
    <TodayScreen
      key={fixture.tenant.slug}
      tenantSlug={fixture.tenant.slug}
      query={keepQuery(params)}
    />
  );
}
