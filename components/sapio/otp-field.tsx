'use client';

import { useId } from 'react';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { cn } from '@/lib/utils';

export const OTP_LENGTH = 6;

/**
 * Six boxes over one real input (OtpField README). Pasting a whole code, autofill from email and
 * the delete key behave as in any text field; typing the sixth digit calls `onComplete`.
 */
export function OtpField({
  id,
  label = 'Mã xác nhận',
  value,
  onChange,
  onComplete,
  help,
  error,
  disabled = false,
  autoFocus = false,
}: {
  id?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  /** Called once the sixth digit is in. */
  onComplete?: (value: string) => void;
  /** Hint under the boxes, replaced by `error` when there is one. */
  help?: string;
  error?: string | null;
  disabled?: boolean;
  autoFocus?: boolean;
}) {
  const generated = useId();
  const inputId = id ?? generated;
  const message = error ?? help;

  return (
    <div className="sp-field">
      <label className="sp-field__label" htmlFor={inputId}>
        {label}
      </label>
      <InputOTP
        id={inputId}
        maxLength={OTP_LENGTH}
        value={value}
        onChange={(next) => onChange(next.replace(/\D/g, ''))}
        {...(onComplete ? { onComplete } : {})}
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        disabled={disabled}
        autoFocus={autoFocus}
        aria-invalid={error ? true : undefined}
        aria-describedby={message ? `${inputId}-help` : undefined}
        containerClassName={cn(error && 'sp-otp--error')}
      >
        <InputOTPGroup>
          {Array.from({ length: OTP_LENGTH }, (_, i) => (
            <InputOTPSlot key={i} index={i} />
          ))}
        </InputOTPGroup>
      </InputOTP>
      {message && (
        <span id={`${inputId}-help`} className={cn('sp-field__help', error && 'text-(--danger)')}>
          {message}
        </span>
      )}
    </div>
  );
}
