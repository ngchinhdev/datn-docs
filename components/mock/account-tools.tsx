'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useAccountStore } from '@/components/mock/account-store';
import { Button } from '@/components/sapio/button';
import { formatMoment } from '@/mock/account-mail';
import { LOCK_MINUTES, MAX_FAILED, sampleAccountLine } from '@/mock/account';
import { SAMPLE_PASSWORD, workspaces, type Account } from '@/mock/fixtures/accounts';
import { resetMockData } from '@/mock/persist';

/**
 * Mock-only controls of the account pages: the clock, which stands still, the sample mailbox and,
 * on the sign-in page, the list of sample accounts (`onPickAccount` fills the form with one).
 */
export function AccountTools({ onPickAccount }: { onPickAccount?: (account: Account) => void }) {
  const { now, advance, mails, accounts, members } = useAccountStore();
  const [listOpen, setListOpen] = useState(false);
  return (
    <aside
      aria-label="Công cụ mock"
      className="fixed bottom-3 left-3 z-30 flex max-w-[calc(100vw-1.5rem)] flex-wrap items-center gap-(--space-2) rounded-(--radius-md) bg-(--surface-raised) px-(--space-3) py-(--space-2) text-sm shadow-[0_0_0_1px_var(--line)]"
    >
      <span className="sp-num text-(--ink-muted)">Mock · {formatMoment(now)}</span>
      <Button size="sm" onClick={() => advance(15)}>
        Cho thời gian trôi 15 phút
      </Button>
      {onPickAccount && (
        <Button
          size="sm"
          aria-expanded={listOpen}
          aria-controls="mock-sample-accounts"
          onClick={() => setListOpen((open) => !open)}
        >
          Tài khoản mẫu
        </Button>
      )}
      <Link href="/mock/mailbox" className="font-medium">
        Hộp thư mẫu ({mails.length})
      </Link>
      <Button size="sm" onClick={resetMockData}>
        Đặt lại dữ liệu mock
      </Button>
      {onPickAccount && listOpen && (
        <div
          id="mock-sample-accounts"
          className="basis-full border-t border-(--line) pt-(--space-2)"
        >
          <ul className="m-0 flex max-h-64 list-none flex-col overflow-y-auto p-0">
            {accounts.map((account) => (
              <li key={account.id}>
                <button
                  type="button"
                  className="w-full rounded-(--radius-sm) px-(--space-2) py-(--space-1) text-left hover:bg-(--surface-sunken)"
                  onClick={() => {
                    onPickAccount(account);
                    setListOpen(false);
                  }}
                >
                  <span className="block font-medium">
                    {sampleAccountLine(account, members, workspaces)}
                  </span>
                  <span className="text-xs text-(--ink-muted)">{account.email}</span>
                </button>
              </li>
            ))}
          </ul>
          <p className="m-0 pt-(--space-2) text-xs text-(--ink-muted)">
            Mật khẩu mẫu của mọi tài khoản:{' '}
            <span className="sp-num font-medium">{SAMPLE_PASSWORD}</span>. Nhập sai {MAX_FAILED} lần
            liên tiếp để thử khóa {LOCK_MINUTES} phút (BR-76).
          </p>
        </div>
      )}
    </aside>
  );
}
