import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { MockToolbar } from '@/components/mock/mock-toolbar';

export const metadata: Metadata = {
  title: 'Mock giao diện',
};

export default function MockLayout({ children }: LayoutProps<'/mock'>) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
          <Link href="/mock" className="font-semibold">
            Mock giao diện
          </Link>
          {/* The toolbar reads the query string, which is only known at request time. */}
          <Suspense fallback={null}>
            <MockToolbar />
          </Suspense>
          <Link
            href="/docs"
            className="ms-auto text-sm text-muted-foreground hover:text-foreground"
          >
            Tài liệu
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
