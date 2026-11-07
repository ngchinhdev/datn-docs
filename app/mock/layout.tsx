import type { Metadata } from 'next';
import { ToastProvider } from '@/components/sapio/toast';

export const metadata: Metadata = {
  title: 'Mock giao diện',
};

export default function MockLayout({ children }: LayoutProps<'/mock'>) {
  return <ToastProvider>{children}</ToastProvider>;
}
