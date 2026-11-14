import { Suspense } from 'react';
import { TenantListScreen } from './tenant-list-screen';

export default function AdminTenantsPage() {
  return (
    <Suspense fallback={null}>
      <TenantListScreen />
    </Suspense>
  );
}
