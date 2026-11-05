import { RootProvider } from 'fumadocs-ui/provider/next';
import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import './global.css';

const geist = Geist({ subsets: ['latin', 'vietnamese'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: {
    template: '%s | Đồ án đặt lịch đa tài nguyên',
    default: 'Đồ án đặt lịch đa tài nguyên',
  },
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning className={cn('font-sans', geist.variable)}>
      <body className="flex min-h-screen flex-col">
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
