'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useAccountStore } from '@/components/mock/account-store';
import { useAuthText } from '@/components/mock/auth-text';
import { Button } from '@/components/sapio/button';
import { OTP_LENGTH, OtpField } from '@/components/sapio/otp-field';
import { SignupLayout } from '@/components/sapio/signup-layout';
import { useMockNow } from '@/components/sapio/use-mock-now';
import { useToast } from '@/components/sapio/toast';
import { verifyMail } from '@/mock/account-mail';
import { addMinutes, MOCK_NOW } from '@/mock/time';
import {
  CODE_ATTEMPTS,
  CODE_MINUTES,
  FIRST_RESEND_SECONDS,
  RESEND_SECONDS,
  WRONG_CODE,
  formatResendIn,
  sampleCode,
  type SignupDraft,
} from '@/mock/signup';

const OTP_ID = 'su-otp';

/**
 * Step 2: the six-digit code sent to the email (BR-16). Any code is right except `000000`, which
 * shows the error state; three wrong tries ask for a new code.
 */
export function VerifyStep({
  draft,
  update,
  onNext,
}: {
  draft: SignupDraft;
  update: (patch: Partial<SignupDraft>) => void;
  onNext: () => void;
}) {
  const toast = useToast();
  const { t } = useAuthText();
  const text = t.signup.verify;
  const now = useMockNow();
  const { now: mailNow, patch } = useAccountStore();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState(CODE_ATTEMPTS);
  const [sentAt, setSentAt] = useState(MOCK_NOW);
  const [cooldown, setCooldown] = useState(FIRST_RESEND_SECONDS);
  const locked = attemptsLeft === 0;
  const elapsed = Math.floor((Date.parse(now) - Date.parse(sentAt)) / 1000);
  const waitLeft = Math.max(0, cooldown - elapsed);

  function verify(value: string) {
    if (locked || value.length !== OTP_LENGTH) return;
    if (value !== WRONG_CODE) {
      update({ verified: true });
      onNext();
      return;
    }
    const left = attemptsLeft - 1;
    setAttemptsLeft(left);
    setError(left > 0 ? text.wrongCode(left) : text.tooMany);
    setCode('');
    document.getElementById(OTP_ID)?.focus();
  }

  function resend() {
    setCode('');
    setError(null);
    setAttemptsLeft(CODE_ATTEMPTS);
    setSentAt(now);
    setCooldown(RESEND_SECONDS);
    patch((d) => ({
      mails: [
        ...d.mails,
        verifyMail({
          name: draft.fullName,
          email: draft.email,
          code: sampleCode(d.mails.length),
          expiresAt: addMinutes(mailNow, CODE_MINUTES),
          attempts: CODE_ATTEMPTS,
          now: mailNow,
          seq: d.mails.length + 1,
        }),
      ],
    }));
    toast({ text: text.resent(draft.email) });
    document.getElementById(OTP_ID)?.focus();
  }

  return (
    <SignupLayout
      current={2}
      title={text.title}
      lead={
        <>
          {text.sentTo} <strong className="font-semibold text-(--ink)">{draft.email}</strong>.{' '}
          <Link href="/mock/signup?step=account" className="sp-link">
            {text.editEmail}
          </Link>
          <span aria-hidden="true"> · </span>
          <Link href="/mock/mailbox" className="sp-link">
            {text.mailbox}
          </Link>
        </>
      }
      top={
        <button
          type="button"
          className="sp-btn sp-btn--ghost sp-btn--sm"
          onClick={() => toast({ text: text.signOutToast })}
        >
          {t.common.signOut}
        </button>
      }
    >
      <form
        noValidate
        className="flex flex-col gap-(--space-4)"
        onSubmit={(e) => {
          e.preventDefault();
          verify(code);
        }}
      >
        <OtpField
          id={OTP_ID}
          value={code}
          onChange={(next) => {
            setCode(next);
            if (error && !locked) setError(null);
          }}
          onComplete={verify}
          error={error}
          help={text.help}
          disabled={locked}
          autoFocus
        />
        <Button
          type="submit"
          variant="primary"
          className="h-12!"
          disabled={locked || code.length !== OTP_LENGTH}
        >
          {text.submit}
        </Button>
        <Button
          variant="ghost"
          className="h-11!"
          disabled={waitLeft > 0 && !locked}
          onClick={resend}
        >
          {waitLeft > 0 && !locked ? text.resendIn(formatResendIn(waitLeft)) : text.resend}
        </Button>
      </form>
    </SignupLayout>
  );
}
