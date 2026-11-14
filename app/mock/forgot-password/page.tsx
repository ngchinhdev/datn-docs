import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ForgotScreen } from './forgot-screen';

export const metadata: Metadata = {
  title: 'Quên mật khẩu · Sapio',
};

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ForgotScreen />
    </Suspense>
  );
}
