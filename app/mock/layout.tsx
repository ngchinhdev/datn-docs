import type { Metadata } from 'next';
import { ToastProvider } from '@/components/sapio/toast';
import { ScheduleRootProvider } from '@/components/mock/schedule-store';

export const metadata: Metadata = {
  title: 'Mock giao diện',
};

export default function MockLayout({ children }: LayoutProps<'/mock'>) {
  return (
    <ToastProvider>
      <ScheduleRootProvider>{children}</ScheduleRootProvider>
    </ToastProvider>
  );
}
