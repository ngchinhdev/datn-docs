import { notFound } from 'next/navigation';
import { fixtureBySlug } from '@/mock/selection';
import { CheckoutScreen } from './checkout-screen';

/** `appointmentId` is an appointment, or an invoice (`inv-…`) that belongs to no appointment. */
export default async function CheckoutPage({
  params,
}: PageProps<'/mock/app/[tenant]/checkout/[appointmentId]'>) {
  const { tenant, appointmentId } = await params;
  const fixture = fixtureBySlug(tenant);
  if (!fixture) notFound();
  return (
    <CheckoutScreen
      key={`${fixture.tenant.slug}-${appointmentId}`}
      tenantSlug={fixture.tenant.slug}
      target={appointmentId}
    />
  );
}
