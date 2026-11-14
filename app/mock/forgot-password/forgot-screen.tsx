'use client';

import { Mail } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { useAccountStore } from '@/components/mock/account-store';
import { AccountTools } from '@/components/mock/account-tools';
import { Notice } from '@/components/mock/password-field';
import { Button } from '@/components/sapio/button';
import { Field } from '@/components/sapio/form';
import { AuthPage, AuthTop } from '@/components/sapio/signup-layout';
import {
  isInviteEmail,
  normalizeEmail,
  requestReset,
  resendWait,
  RESET_MINUTES,
} from '@/mock/account';
import { formatWait, resetMail } from '@/mock/account-mail';

/**
 * MH-04: ask for a reset link. The answer is the same whether or not the email has an account,
 * and a new link can be asked for after a minute (BR-77).
 */
export function ForgotScreen() {
  const { now, accounts, resetTokens, resetSentAt, patch } = useAccountStore();
  const initialEmail = useSearchParams().get('email') ?? '';
  const [email, setEmail] = useState(initialEmail);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const wait = sentTo ? resendWait(resetSentAt, sentTo, now) : 0;

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!isInviteEmail(email)) {
      setError('Email chưa đúng. Ví dụ: an@email.vn.');
      return;
    }
    setError(null);
    const key = normalizeEmail(email);
    if (resendWait(resetSentAt, key, now) > 0) return;
    const result = requestReset(
      accounts,
      resetTokens,
      resetSentAt,
      key,
      now,
      `dat-lai-${resetTokens.length + 1}`,
    );
    const { issued } = result;
    const account = issued ? accounts.find((a) => a.id === issued.accountId) : undefined;
    patch((d) => ({
      resetTokens: result.tokens,
      resetSentAt: result.lastSent,
      mails:
        issued && account
          ? [...d.mails, resetMail(account, issued.token, issued.expiresAt, now, issued.seq)]
          : d.mails,
    }));
    setSentTo(key);
  }

  return (
    <>
      <AuthPage
        top={
          <AuthTop>
            <Link href="/mock/login" className="text-sm font-semibold no-underline">
              Đăng nhập
            </Link>
          </AuthTop>
        }
      >
        <div>
          <h1 className="sp-auth__title">Quên mật khẩu</h1>
          <p className="sp-auth__lead">
            Nhập email đăng nhập. Sapio gửi một link để đặt mật khẩu mới.
          </p>
        </div>
        <form onSubmit={submit} noValidate className="flex flex-col gap-(--space-4)">
          <Field id="fg-mail" label="Email" size="md" error={error}>
            <input
              id="fg-mail"
              type="email"
              autoComplete="email"
              value={email}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? 'fg-mail-help' : undefined}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          {sentTo && (
            <Notice tone="info" role="status" icon={<Mail size={18} aria-hidden="true" />}>
              Nếu <strong>{sentTo}</strong> có tài khoản Sapio, link đặt lại vừa được gửi tới đó.
              Link dùng được <strong>{RESET_MINUTES} phút</strong> và chỉ một lần. Không thấy thì
              xem thư mục Spam.{' '}
              <Link href="/mock/mailbox" className="font-medium">
                Mock: mở hộp thư mẫu
              </Link>
            </Notice>
          )}
          {sentTo ? (
            <Button type="submit" variant="secondary" className="h-12!" disabled={wait > 0}>
              {wait > 0 ? `Gửi lại sau ${formatWait(wait)}` : 'Gửi lại link'}
            </Button>
          ) : (
            <Button type="submit" variant="primary" className="h-12!">
              Gửi link đặt lại
            </Button>
          )}
        </form>
        <Link href="/mock/login" className="self-center text-sm font-medium">
          Quay lại đăng nhập
        </Link>
      </AuthPage>
      <AccountTools />
    </>
  );
}
