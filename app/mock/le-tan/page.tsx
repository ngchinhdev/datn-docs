import { parseSelection } from '@/mock/selection';
import { keepQuery } from './query';
import { ReceptionScreen } from './reception-screen';

export default async function StaffCalendarPage({ searchParams }: PageProps<'/mock/le-tan'>) {
  const params = await searchParams;
  const { fixture } = parseSelection(params.tenant, params.role);
  return (
    <ReceptionScreen
      key={fixture.tenant.slug}
      tenantSlug={fixture.tenant.slug}
      view="staff"
      query={keepQuery(params)}
    />
  );
}
