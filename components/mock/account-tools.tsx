'use client';

import Link from 'next/link';
import { Wrench } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useAccountStore } from '@/components/mock/account-store';
import { Button } from '@/components/sapio/button';
import { Tip } from '@/components/sapio/tooltip';
import { formatMoment } from '@/mock/account-mail';
import { LOCK_MINUTES, MAX_FAILED, sampleAccountLine, type LoginDoor } from '@/mock/account';
import { SAMPLE_PASSWORD, workspaces, type Account } from '@/mock/fixtures/accounts';
import { resetMockData } from '@/mock/persist';

/**
 * Mock-only controls of the account pages: the clock, which stands still, the sample mailbox and,
 * on the sign-in page, the list of sample accounts (`onPickAccount` fills the form with one).
 */
export function AccountTools({
  onPickAccount,
  door = 'staff',
}: {
  onPickAccount?: (account: Account) => void;
  /** Which accounts the list shows: staff accounts, or the platform administrators. */
  door?: LoginDoor;
}) {
  const { now, advance, mails, accounts, members } = useAccountStore();
  const [listOpen, setListOpen] = useState(false);
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);

  // Esc and a press outside close the panel.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      toggle.current?.focus();
    };
    const onPress = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPress);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPress);
    };
  }, [open]);

  return (
    <aside ref={root} aria-label="Công cụ mock" className="fixed right-4 bottom-4 z-30">
      <Tip label="Công cụ mock" side="top-end">
        <button
          ref={toggle}
          type="button"
          className="inline-flex size-11 items-center justify-center rounded-full border-0 bg-(--surface-raised) text-(--ink) shadow-[0_0_0_1px_var(--line),var(--shadow-popover)] hover:bg-(--fill-tonal) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
          aria-label="Công cụ mock"
          aria-expanded={open}
          aria-controls="mock-tools-panel"
          onClick={() => setOpen((v) => !v)}
        >
          <Wrench size={18} aria-hidden="true" />
        </button>
      </Tip>
      {open && (
        <div
          id="mock-tools-panel"
          className="absolute right-0 bottom-[calc(100%+8px)] flex w-[min(320px,calc(100vw-2rem))] max-h-[calc(100dvh-96px)] flex-col items-stretch gap-(--space-2) overflow-y-auto rounded-(--radius-md) bg-(--surface-raised) p-(--space-3) text-sm shadow-[0_0_0_1px_var(--line),var(--shadow-popover)]"
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
          <Link href="/mock/screens" className="font-medium">
            Danh sách màn hình
          </Link>
          <Button size="sm" onClick={resetMockData}>
            Đặt lại dữ liệu mock
          </Button>
          {onPickAccount && listOpen && (
            <div id="mock-sample-accounts" className="border-t border-(--line) pt-(--space-2)">
              <ul className="m-0 flex max-h-64 list-none flex-col overflow-y-auto p-0">
                {accounts
                  .filter((account) => Boolean(account.platformAdmin) === (door === 'admin'))
                  .map((account) => (
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
                <span className="sp-num font-medium">{SAMPLE_PASSWORD}</span>. Nhập sai {MAX_FAILED}{' '}
                lần liên tiếp để thử khóa {LOCK_MINUTES} phút (BR-76).
              </p>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
