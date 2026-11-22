'use client';

import { Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { useAuthText } from '@/components/mock/auth-text';
import { Button } from '@/components/sapio/button';
import { Field } from '@/components/sapio/form';
import { SignupLayout } from '@/components/sapio/signup-layout';
import { emailError, passwordError, type SignupDraft } from '@/mock/signup';

type Key = 'fullName' | 'email' | 'password' | 'terms';
const IDS: Record<Key, string> = {
  fullName: 'su-name',
  email: 'su-mail',
  password: 'su-pass',
  terms: 'su-terms',
};

/** Step 1: the owner's account. The password follows BR-73 and never leaves this component. */
export function AccountStep({
  draft,
  update,
  password,
  setPassword,
  onNext,
}: {
  draft: SignupDraft;
  update: (patch: Partial<SignupDraft>) => void;
  password: string;
  setPassword: (value: string) => void;
  onNext: () => void;
}) {
  const [touched, setTouched] = useState<Partial<Record<Key, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [shown, setShown] = useState(false);
  const { lang, t } = useAuthText();
  const text = t.signup.account;

  const errors: Record<Key, string | null> = {
    fullName: draft.fullName.trim() ? null : t.errors.nameEmpty,
    email: emailError(draft.email, lang),
    password: passwordError(password, lang),
    terms: draft.terms ? null : t.errors.termsRequired,
  };
  const shownError = (key: Key) => (submitted || touched[key] ? errors[key] : null);
  const touch = (key: Key) => () => setTouched((t) => ({ ...t, [key]: true }));

  function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    const first = (Object.keys(errors) as Key[]).find((key) => errors[key]);
    if (first) {
      document.getElementById(IDS[first])?.focus();
      return;
    }
    update({ passwordOk: true, email: draft.email.trim() });
    onNext();
  }

  return (
    <SignupLayout
      current={1}
      title={text.title}
      lead={text.lead}
      top={
        <Link href="/mock/login" className="sp-btn sp-btn--ghost sp-btn--sm no-underline">
          {t.common.login}
        </Link>
      }
    >
      <form onSubmit={submit} noValidate className="flex flex-col gap-(--space-4)">
        <Field id="su-name" label={t.common.fullName} size="md" error={shownError('fullName')}>
          <input
            id="su-name"
            type="text"
            placeholder={text.namePlaceholder}
            autoComplete="name"
            value={draft.fullName}
            aria-invalid={shownError('fullName') ? true : undefined}
            aria-describedby={shownError('fullName') ? 'su-name-help' : undefined}
            onChange={(e) => update({ fullName: e.target.value })}
            onBlur={touch('fullName')}
          />
        </Field>
        <Field
          id="su-mail"
          label="Email"
          size="md"
          help={text.emailHelp}
          error={shownError('email')}
        >
          <input
            id="su-mail"
            type="email"
            placeholder={text.emailPlaceholder}
            autoComplete="email"
            value={draft.email}
            aria-invalid={shownError('email') ? true : undefined}
            aria-describedby="su-mail-help"
            onChange={(e) => update({ email: e.target.value, verified: false })}
            onBlur={touch('email')}
          />
        </Field>
        <Field
          id="su-pass"
          label={t.common.password}
          size="md"
          help={
            <>
              {text.passwordHint} <em>{text.passwordExample}</em>.
            </>
          }
          error={shownError('password')}
        >
          <input
            id="su-pass"
            type={shown ? 'text' : 'password'}
            autoComplete="new-password"
            value={password}
            aria-invalid={shownError('password') ? true : undefined}
            aria-describedby="su-pass-help"
            onChange={(e) => setPassword(e.target.value)}
            onBlur={touch('password')}
          />
          <button
            type="button"
            className="sp-icon-btn me-1"
            aria-label={shown ? t.common.hidePassword : t.common.showPassword}
            aria-pressed={shown}
            onClick={() => setShown((v) => !v)}
          >
            {shown ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
          </button>
        </Field>
        <div className="flex flex-col gap-(--space-1)">
          <label className="sp-check">
            <input
              id="su-terms"
              type="checkbox"
              checked={draft.terms}
              aria-invalid={shownError('terms') ? true : undefined}
              aria-describedby={shownError('terms') ? 'su-terms-help' : undefined}
              onChange={(e) => update({ terms: e.target.checked })}
            />
            <span>
              {text.termsBefore}{' '}
              <a href="#" className="sp-link">
                {text.terms}
              </a>{' '}
              {text.termsAnd}{' '}
              <a href="#" className="sp-link">
                {text.privacy}
              </a>{' '}
              {text.termsAfter}
            </span>
          </label>
          {shownError('terms') && (
            <span id="su-terms-help" className="sp-field__help text-(--danger)">
              {shownError('terms')}
            </span>
          )}
        </div>
        <Button type="submit" variant="primary" className="h-12!">
          {text.submit}
        </Button>
      </form>
    </SignupLayout>
  );
}
