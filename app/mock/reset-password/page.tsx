import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ResetScreen } from './reset-screen';

export const metadata: Metadata = {
  title: 'Đặt mật khẩu mới · Sapio',
};

export default function ResetPasswordPage() {
  // The link carries `?token=`, which is only known in the browser.
  return (
    <Suspense fallback={null}>
      <ResetScreen />
    </Suspense>
  );
}
