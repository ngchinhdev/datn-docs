'use client';

import { Lock } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { useAccountStore } from '@/components/mock/account-store';
import { AccountTools } from '@/components/mock/account-tools';
import { useAuthText } from '@/components/mock/auth-text';
import { Notice, PasswordField } from '@/components/mock/password-field';
import { Button } from '@/components/sapio/button';
import { Field } from '@/components/sapio/form';
import { AuthPage } from '@/components/sapio/signup-layout';
import {
  afterLogin,
  attemptLogin,
  doorsOf,
  entryHref,
  LOCK_MINUTES,
  lockedStatuses,
  lockedUntil,
  MAX_FAILED,
  normalizeEmail,
} from '@/mock/account';
import { formatWait, lockMail } from '@/mock/account-mail';
import { workspaces } from '@/mock/fixtures/accounts';
import { formatTime } from '@/mock/time';

/** MH-03: email and password; five wrong tries in a row lock the email for 15 minutes (BR-76). */
export function LoginScreen() {
  const router = useRouter();
  const store = useAccountStore();
  const { t } = useAuthText();
  const { now, accounts, members, records, patch } = store;
  const initialEmail = useSearchParams().get('email') ?? '';
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [persistent, setPersistent] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);

  const until = email.trim() ? lockedUntil(records, email, now) : null;
  const waitSeconds = until ? Math.ceil((Date.parse(until) - Date.parse(now)) / 1000) : 0;

  function submit(e: FormEvent) {
    e.preventDefault();
    if (until) return;
    const result = attemptLogin(accounts, records, email, password, now);
    patch(() => ({ records: result.records }));
    const { outcome } = result;
    if (outcome.kind === 'wrong') {
      setFailed(true);
      setRemaining(outcome.remaining);
      setPassword('');
      return;
    }
    if (outcome.kind === 'locked') {
      setFailed(false);
      setPassword('');
      if (outcome.notify) {
        const account = accounts.find((a) => a.email === normalizeEmail(email));
        if (account) {
          patch((d) => ({
            mails: [...d.mails, lockMail(account, outcome.until, now, d.mails.length + 1)],
          }));
        }
      }
      return;
    }

    const { account } = outcome;
    patch(() => ({ session: { accountId: account.id, persistent } }));
    if (account.platformAdmin) {
      router.push('/mock/admin');
      return;
    }
    const doors = doorsOf(account.id, members, workspaces, lockedStatuses(store.locks));
    const last = store.lastWorkspace[account.id] ?? null;
    const destination = afterLogin(doors, last);
    if (destination.kind === 'enter') {
      const workspace = workspaces.find((w) => w.id === destination.workspaceId)!;
      const member = members.find(
        (m) => m.accountId === account.id && m.workspaceId === workspace.id,
      )!;
      const href = entryHref(workspace, member, destination.entry);
      if (href) {
        patch((d) => ({ lastWorkspace: { ...d.lastWorkspace, [account.id]: workspace.id } }));
        router.push(href);
        return;
      }
    }
    router.push('/mock/select-workspace');
  }

  const errorText = failed
    ? remaining
      ? t.login.wrongRemaining(remaining, LOCK_MINUTES)
      : t.login.wrong
    : null;

  return (
    <>
      <AuthPage
        aside="login"
        link={
          <Link
            href="/mock/signup"
            className="px-3 py-2.5 text-sm font-semibold no-underline max-[899px]:hidden"
          >
            {t.login.signupTop}
          </Link>
        }
      >
        <div>
          <h1 className="sp-auth__title">{t.login.title}</h1>
          <p className="sp-auth__lead">{t.login.lead}</p>
        </div>
        <form onSubmit={submit} noValidate className="flex flex-col gap-(--space-4)">
          {until && (
            <Notice tone="danger" role="alert" icon={<Lock size={18} aria-hidden="true" />}>
              <strong>{t.login.lockedTitle(formatTime(until))}</strong>
              <br />
              {t.login.lockedBody(MAX_FAILED, normalizeEmail(email))}
            </Notice>
          )}
          <Field id="li-mail" label="Email" size="md">
            <input
              id="li-mail"
              type="email"
              autoComplete="email"
              placeholder={t.login.emailPlaceholder}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setFailed(false);
              }}
            />
          </Field>
          <PasswordField
            id="li-pass"
            label={t.common.password}
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
            error={errorText}
          />
          <label className="sp-check">
            <input
              type="checkbox"
              checked={persistent}
              onChange={(e) => setPersistent(e.target.checked)}
            />
            <span>
              {t.login.keep}
              <span className="sp-check__hint">{t.login.keepHint}</span>
            </span>
          </label>
          <Button type="submit" variant="primary" className="h-12!" disabled={Boolean(until)}>
            {until ? t.login.submitLocked(formatWait(waitSeconds)) : t.login.submit}
          </Button>
          {until ? (
            <Link
              href={`/mock/forgot-password?email=${encodeURIComponent(email.trim())}`}
              className="sp-btn sp-btn--secondary h-12! no-underline"
            >
              {t.login.resetPassword}
            </Link>
          ) : (
            <Link
              href={`/mock/forgot-password?email=${encodeURIComponent(email.trim())}`}
              className="self-center text-sm font-medium"
            >
              {t.common.forgot}
            </Link>
          )}
        </form>
        <p className="m-0 border-t border-(--line) pt-3.5 text-[13px] leading-[18px] text-(--ink-muted)">
          {t.login.guestNote}
        </p>
        <p className="m-0 text-center text-sm text-(--ink-muted)">
          {t.login.noAccount} <Link href="/mock/signup">{t.login.noAccountLink}</Link>
        </p>
      </AuthPage>
      <AccountTools
        onPickAccount={(account) => {
          setEmail(account.email);
          setPassword(account.password);
          setFailed(false);
        }}
      />
    </>
  );
}
