import { Suspense } from 'react';
import { PlatformAuditScreen } from './platform-audit-screen';

export default function AdminAuditLogPage() {
  return (
    <Suspense fallback={null}>
      <PlatformAuditScreen />
    </Suspense>
  );
}
