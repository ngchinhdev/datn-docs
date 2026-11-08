import { notFound } from 'next/navigation';
import { fixtureBySlug } from '@/mock/selection';
import { CalendarGate } from './calendar-gate';

export default async function CalendarPage({ params }: PageProps<'/mock/app/[tenant]/calendar'>) {
  const { tenant } = await params;
  const fixture = fixtureBySlug(tenant);
  if (!fixture) notFound();
  return <CalendarGate key={fixture.tenant.slug} tenantSlug={fixture.tenant.slug} />;
}
