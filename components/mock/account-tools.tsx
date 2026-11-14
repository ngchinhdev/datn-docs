'use client';

import Link from 'next/link';
import { useAccountStore } from '@/components/mock/account-store';
import { Button } from '@/components/sapio/button';
import { formatMoment } from '@/mock/account-mail';

/** Mock-only controls of the account pages: the clock, which stands still, and the sample mailbox. */
export function AccountTools() {
  const { now, advance, mails } = useAccountStore();
  return (
    <aside
      aria-label="Công cụ mock"
      className="fixed bottom-3 left-3 z-30 flex max-w-[calc(100vw-1.5rem)] flex-wrap items-center gap-(--space-2) rounded-(--radius-md) bg-(--surface-raised) px-(--space-3) py-(--space-2) text-sm shadow-[0_0_0_1px_var(--line)]"
    >
      <span className="sp-num text-(--ink-muted)">Mock · {formatMoment(now)}</span>
      <Button size="sm" onClick={() => advance(15)}>
        Cho thời gian trôi 15 phút
      </Button>
      <Link href="/mock/mailbox" className="font-medium">
        Hộp thư mẫu ({mails.length})
      </Link>
    </aside>
  );
}
