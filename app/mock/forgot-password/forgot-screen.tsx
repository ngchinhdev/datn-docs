'use client';

import { Mail } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { useAccountStore } from '@/components/mock/account-store';
import { AccountTools } from '@/components/mock/account-tools';
import { useAuthText } from '@/components/mock/auth-text';
import { Notice } from '@/components/mock/password-field';
import { Button } from '@/components/sapio/button';
import { Field } from '@/components/sapio/form';
import { AuthPage } from '@/components/sapio/signup-layout';
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
  const { t } = useAuthText();
  const initialEmail = useSearchParams().get('email') ?? '';
  const [email, setEmail] = useState(initialEmail);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const wait = sentTo ? resendWait(resetSentAt, sentTo, now) : 0;

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!isInviteEmail(email)) {
      setError(t.forgot.emailInvalid);
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
        aside="forgot"
        link={
          <Link href="/mock/login" className="px-3 py-2.5 text-sm font-semibold no-underline">
            {t.common.login}
          </Link>
        }
      >
        <div>
          <h1 className="sp-auth__title">{t.forgot.title}</h1>
          <p className="sp-auth__lead">{t.forgot.lead}</p>
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
              {t.forgot.sentBefore} <strong>{sentTo}</strong> {t.forgot.sentAfter}{' '}
              <strong>{t.forgot.minutes(RESET_MINUTES)}</strong> {t.forgot.sentEnd}{' '}
              <Link href="/mock/mailbox" className="font-medium">
                {t.forgot.mailbox}
              </Link>
            </Notice>
          )}
          {sentTo ? (
            <Button type="submit" variant="secondary" className="h-12!" disabled={wait > 0}>
              {wait > 0 ? t.forgot.resendIn(formatWait(wait)) : t.forgot.resend}
            </Button>
          ) : (
            <Button type="submit" variant="primary" className="h-12!">
              {t.forgot.submit}
            </Button>
          )}
        </form>
        <Link href="/mock/login" className="self-center text-sm font-medium">
          {t.forgot.back}
        </Link>
      </AuthPage>
      <AccountTools />
    </>
  );
}
