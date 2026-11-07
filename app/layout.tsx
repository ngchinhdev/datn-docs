import { RootProvider } from 'fumadocs-ui/provider/next';
import type { Metadata } from 'next';
import { Be_Vietnam_Pro } from 'next/font/google';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import './global.css';
import './sapio/tokens.css';
import './sapio/components.css';

const beVietnam = Be_Vietnam_Pro({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin', 'vietnamese'],
  variable: '--font-be-vietnam',
});

export const metadata: Metadata = {
  title: {
    template: '%s | Đồ án đặt lịch đa tài nguyên',
    default: 'Đồ án đặt lịch đa tài nguyên',
  },
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning className={cn('font-sans', beVietnam.variable)}>
      <body className="flex min-h-screen flex-col">
        {/* tokens.css switches theme on [data-theme], shadcn and Fumadocs on .dark. */}
        <RootProvider theme={{ attribute: ['class', 'data-theme'] }}>{children}</RootProvider>
      </body>
    </html>
  );
}
