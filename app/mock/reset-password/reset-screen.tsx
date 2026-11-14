'use client';

import { Info } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { useAccountStore } from '@/components/mock/account-store';
import { AccountTools } from '@/components/mock/account-tools';
import { ErrorPage } from '@/components/mock/error-page';
import { Notice, PasswordField } from '@/components/mock/password-field';
import { Button } from '@/components/sapio/button';
import { AuthPage, AuthTop } from '@/components/sapio/signup-layout';
import {
  afterLogin,
  doorsOf,
  entryHref,
  lockedStatuses,
  resetPassword,
  resetState,
  type ResetState,
} from '@/mock/account';
import { workspaces } from '@/mock/fixtures/accounts';
import { passwordError, PASSWORD_MIN } from '@/mock/signup';

const DEAD: Record<Exclude<ResetState, 'ok'>, { title: string; lead: string }> = {
  expired: {
    title: 'Link đã hết hạn',
    lead: 'Link đặt lại mật khẩu chỉ dùng được 30 phút. Xin link mới để tiếp tục.',
  },
  used: {
    title: 'Link đã được dùng',
    lead: 'Mỗi link chỉ đặt được mật khẩu một lần. Cần đặt lại nữa thì xin link mới.',
  },
  replaced: {
    title: 'Đã có link mới hơn',
    lead: 'Bạn vừa xin một link khác nên link này không còn dùng được. Mở link trong email mới nhất.',
  },
  unknown: {
    title: 'Không tìm thấy link',
    lead: 'Link có thể đã cũ hoặc gõ sai. Xin link mới để tiếp tục.',
  },
};

/** MH-04, second page: a new password from the link in the email (BR-77, BR-73). */
export function ResetScreen() {
  const router = useRouter();
  const token = useSearchParams().get('token') ?? '';
  const store = useAccountStore();
  const { now, accounts, members, records, resetTokens, patch } = store;
  const [password, setPassword] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const state = resetState(resetTokens, token, now);
  const account = accounts.find(
    (a) => a.id === resetTokens.find((t) => t.token === token)?.accountId,
  );

  if (state !== 'ok' || !account) {
    const dead = DEAD[state === 'ok' ? 'unknown' : state];
    return (
      <>
        <ErrorPage
          title={dead.title}
          lead={dead.lead}
          actions={
            <>
              <Link href="/mock/forgot-password" className="sp-btn sp-btn--primary no-underline">
                Xin link mới
              </Link>
              <Link href="/mock/login" className="sp-btn sp-btn--ghost no-underline">
                Về đăng nhập
              </Link>
            </>
          }
        />
        <AccountTools />
      </>
    );
  }

  const length = [...password].length;
  const error = passwordError(password);
  const hasLength = length >= PASSWORD_MIN;
  const notCommon = hasLength && error === null;

  function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (error) return;
    const result = resetPassword(accounts, resetTokens, records, token, password, now);
    if (!result.ok) return;
    patch(() => ({
      accounts: result.accounts,
      resetTokens: result.tokens,
      records: result.records,
      session: { accountId: result.account.id, persistent: false },
    }));
    // BR-77: into the tenant used last; BR-79 decides when that tenant cannot be entered.
    const doors = doorsOf(result.account.id, members, workspaces, lockedStatuses(store.locks));
    const destination = afterLogin(doors, store.lastWorkspace[result.account.id] ?? null, {
      resumeLast: true,
    });
    if (destination.kind === 'enter') {
      const workspace = workspaces.find((w) => w.id === destination.workspaceId)!;
      const member = members.find(
        (m) => m.accountId === result.account.id && m.workspaceId === workspace.id,
      )!;
      const href = entryHref(workspace, member, destination.entry);
      if (href) {
        router.push(href);
        return;
      }
    }
    router.push('/mock/select-workspace');
  }

  return (
    <>
      <AuthPage top={<AuthTop />}>
        <div>
          <h1 className="sp-auth__title">Đặt mật khẩu mới</h1>
          <p className="sp-auth__lead">Cho tài khoản {account.email}.</p>
        </div>
        <form onSubmit={submit} noValidate className="flex flex-col gap-(--space-4)">
          <PasswordField
            id="rs-pass"
            label="Mật khẩu mới"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            help="Ít nhất 15 ký tự. Một câu dễ nhớ là đủ."
            error={submitted && error ? error : null}
          />
          {length > 0 && (
            <ul className="m-0 -mt-1 flex list-none flex-col gap-1 p-0">
              <li>
                <p className={`sp-fit m-0 ${hasLength ? 'sp-fit--ok' : 'sp-fit--bad'}`}>
                  <span>
                    {length} ký tự{hasLength ? '' : `, cần ít nhất ${PASSWORD_MIN}`}
                  </span>
                </p>
              </li>
              {hasLength && (
                <li>
                  <p className={`sp-fit m-0 ${notCommon ? 'sp-fit--ok' : 'sp-fit--bad'}`}>
                    <span>
                      {notCommon
                        ? 'Không nằm trong danh sách mật khẩu phổ biến hay đã lộ'
                        : (error ?? '')}
                    </span>
                  </p>
                </li>
              )}
            </ul>
          )}
          <Notice tone="note" role="note" icon={<Info size={18} aria-hidden="true" />}>
            Đặt xong, các máy khác đang đăng nhập bằng tài khoản này sẽ bị đăng xuất. Bạn vào thẳng
            cơ sở dùng gần nhất.
          </Notice>
          <Button type="submit" variant="primary" className="h-12!">
            Lưu mật khẩu và đăng nhập
          </Button>
        </form>
      </AuthPage>
      <AccountTools />
    </>
  );
}
