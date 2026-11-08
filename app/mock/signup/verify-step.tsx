'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/sapio/button';
import { OTP_LENGTH, OtpField } from '@/components/sapio/otp-field';
import { SignupLayout } from '@/components/sapio/signup-layout';
import { useMockNow } from '@/components/sapio/use-mock-now';
import { useToast } from '@/components/sapio/toast';
import { MOCK_NOW } from '@/mock/time';
import {
  CODE_ATTEMPTS,
  FIRST_RESEND_SECONDS,
  RESEND_SECONDS,
  WRONG_CODE,
  formatResendIn,
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
  const now = useMockNow();
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
    setError(
      left > 0
        ? `Mã chưa đúng. Còn ${left} lần thử.`
        : 'Bạn đã nhập sai quá số lần cho phép. Gửi mã mới để thử lại.',
    );
    setCode('');
    document.getElementById(OTP_ID)?.focus();
  }

  function resend() {
    setCode('');
    setError(null);
    setAttemptsLeft(CODE_ATTEMPTS);
    setSentAt(now);
    setCooldown(RESEND_SECONDS);
    toast({ text: `Đã gửi mã mới tới ${draft.email}.` });
    document.getElementById(OTP_ID)?.focus();
  }

  return (
    <SignupLayout
      current={2}
      title="Nhập mã trong email"
      lead={
        <>
          Đã gửi mã 6 số tới <strong className="font-semibold text-(--ink)">{draft.email}</strong>.{' '}
          <Link href="/mock/signup?step=account">Sửa email</Link>
        </>
      }
      maxWidth={560}
      top={
        <button
          type="button"
          className="sp-btn sp-btn--ghost sp-btn--sm"
          onClick={() => toast({ text: 'Đăng xuất: chưa có trong mock.' })}
        >
          Đăng xuất
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
          help="Gõ đủ 6 số là tự xác nhận. Không thấy email? Xem trong thư rác."
          disabled={locked}
          autoFocus
        />
        <Button
          type="submit"
          variant="primary"
          className="h-12!"
          disabled={locked || code.length !== OTP_LENGTH}
        >
          Xác nhận
        </Button>
        <Button
          variant="ghost"
          className="h-11!"
          disabled={waitLeft > 0 && !locked}
          onClick={resend}
        >
          {waitLeft > 0 && !locked ? `Gửi lại mã sau ${formatResendIn(waitLeft)}` : 'Gửi lại mã'}
        </Button>
      </form>
    </SignupLayout>
  );
}
