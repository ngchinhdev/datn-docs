import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LoginScreen } from '../../login/login-screen';

export const metadata: Metadata = {
  title: 'Đăng nhập quản trị · Sapio',
};

/** MH-63: the sign-in page of the platform administrators (T-18). */
export default function AdminLoginPage() {
  // The screen reads `?email=` from the query string, which is only known in the browser.
  return (
    <Suspense fallback={null}>
      <LoginScreen door="admin" />
    </Suspense>
  );
}
