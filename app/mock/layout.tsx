import type { Metadata } from 'next';
import { ToastProvider } from '@/components/sapio/toast';
import { AccountProvider } from '@/components/mock/account-store';
import { ScheduleRootProvider } from '@/components/mock/schedule-store';

export const metadata: Metadata = {
  title: 'Mock giao diện',
};

export default function MockLayout({ children }: LayoutProps<'/mock'>) {
  return (
    <ToastProvider>
      <AccountProvider>
        <ScheduleRootProvider>{children}</ScheduleRootProvider>
      </AccountProvider>
    </ToastProvider>
  );
}
