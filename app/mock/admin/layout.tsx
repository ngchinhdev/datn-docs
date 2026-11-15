import { Suspense } from 'react';
import { AdminFrame } from './admin-frame';

/** The platform administration: its own sidebar, no tenant, no mock header. */
export default function AdminLayout({ children }: LayoutProps<'/mock/admin'>) {
  return (
    <Suspense fallback={null}>
      <AdminFrame>{children}</AdminFrame>
    </Suspense>
  );
}
