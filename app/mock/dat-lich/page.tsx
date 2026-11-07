import { BookingFlow } from './booking-flow';
import { parseSelection } from '@/mock/selection';

export default async function BookingPage({ searchParams }: PageProps<'/mock/dat-lich'>) {
  const params = await searchParams;
  const { fixture } = parseSelection(params.tenant, params.role);
  // Keyed by tenant so switching tenant restarts the flow.
  return <BookingFlow key={fixture.tenant.slug} tenantSlug={fixture.tenant.slug} />;
}
