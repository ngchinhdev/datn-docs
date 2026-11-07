import { BookingFlow } from './booking-flow';
import { parseSelection } from '@/mock/selection';

export default async function BookingPage({ searchParams }: PageProps<'/mock/dat-lich'>) {
  const params = await searchParams;
  const { fixture } = parseSelection(params.tenant, params.role);
  const newCustomer = params.khach === 'moi';
  // Keyed so switching tenant or customer restarts the flow.
  return (
    <BookingFlow
      key={`${fixture.tenant.slug}-${newCustomer}`}
      tenantSlug={fixture.tenant.slug}
      newCustomer={newCustomer}
    />
  );
}
