import type { Metadata } from 'next';
import { Suspense } from 'react';
import { SignupFlow } from './signup-flow';

export const metadata: Metadata = {
  title: 'Đăng ký cơ sở · Sapio',
};

export default function SignupPage() {
  // The flow reads `?step=` from the query string, which is only known in the browser.
  return (
    <Suspense fallback={null}>
      <SignupFlow />
    </Suspense>
  );
}
