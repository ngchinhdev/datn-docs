'use client';

import { useParams } from 'next/navigation';
import { NotFoundInApp } from '@/components/mock/error-views';

export default function AppNotFound() {
  const { tenant } = useParams<{ tenant: string }>();
  return <NotFoundInApp tenantSlug={tenant} />;
}
