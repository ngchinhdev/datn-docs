'use client';

import { ArrowUp, Eye, EyeOff } from 'lucide-react';
import { useState, type KeyboardEvent, type ReactNode } from 'react';
import { useAuthText } from '@/components/mock/auth-text';
import { Field } from '@/components/sapio/form';

/** A password input with the show/hide button (BR-73 lets people paste and look). */
export function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  help,
  error,
  labelEnd,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: 'current-password' | 'new-password';
  help?: ReactNode;
  error?: string | null | undefined;
  /** On the right of the label row. */
  labelEnd?: ReactNode;
}) {
  const [shown, setShown] = useState(false);
  const [caps, setCaps] = useState(false);
  const { t } = useAuthText();
  const described = [help || error ? `${id}-help` : null, caps ? `${id}-caps` : null]
    .filter(Boolean)
    .join(' ');
  const readCaps = (e: KeyboardEvent<HTMLInputElement>) => setCaps(e.getModifierState('CapsLock'));
  return (
    <div className="flex flex-col gap-1.5">
      <Field id={id} label={label} size="md" help={help} error={error} labelEnd={labelEnd}>
        <input
          id={id}
          type={shown ? 'text' : 'password'}
          autoComplete={autoComplete}
          value={value}
          aria-invalid={error ? true : undefined}
          aria-describedby={described || undefined}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={readCaps}
          onKeyUp={readCaps}
          onBlur={() => setCaps(false)}
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
      {caps && (
        <p
          id={`${id}-caps`}
          role="status"
          className="m-0 flex items-center gap-1.5 rounded-[10px] bg-(--status-no-show-soft) px-2.5 py-2 text-[13px] leading-[18px] font-medium text-(--status-no-show)"
        >
          <ArrowUp size={16} aria-hidden="true" />
          {t.common.capsLock}
        </p>
      )}
    </div>
  );
}

/** Notice box of the account pages: a colored band with an icon and a few lines. */
export function Notice({
  tone,
  icon,
  role,
  children,
}: {
  tone: 'danger' | 'info' | 'note';
  icon: ReactNode;
  role: 'alert' | 'status' | 'note';
  children: ReactNode;
}) {
  const background =
    tone === 'danger'
      ? 'bg-(--danger-soft)'
      : tone === 'info'
        ? 'bg-(--brand-soft)'
        : 'bg-(--fill-tonal)';
  return (
    <div
      role={role}
      className={`flex items-start gap-2.5 rounded-(--radius-md) px-3.5 py-3 text-sm leading-5 ${background}`}
    >
      <span className="mt-px inline-flex flex-none">{icon}</span>
      <div>{children}</div>
    </div>
  );
}
