import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LoginScreen } from './login-screen';

export const metadata: Metadata = {
  title: 'Đăng nhập · Sapio',
};

export default function LoginPage() {
  // The screen reads `?email=` from the query string, which is only known in the browser.
  return (
    <Suspense fallback={null}>
      <LoginScreen />
    </Suspense>
  );
}
