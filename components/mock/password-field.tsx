'use client';

import { Eye, EyeOff } from 'lucide-react';
import { useState, type ReactNode } from 'react';
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
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: 'current-password' | 'new-password';
  help?: ReactNode;
  error?: string | null | undefined;
}) {
  const [shown, setShown] = useState(false);
  return (
    <Field id={id} label={label} size="md" help={help} error={error}>
      <input
        id={id}
        type={shown ? 'text' : 'password'}
        autoComplete={autoComplete}
        value={value}
        aria-invalid={error ? true : undefined}
        aria-describedby={help || error ? `${id}-help` : undefined}
        onChange={(e) => onChange(e.target.value)}
      />
      <button
        type="button"
        className="sp-icon-btn me-1"
        aria-label={shown ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
        aria-pressed={shown}
        onClick={() => setShown((v) => !v)}
      >
        {shown ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
      </button>
    </Field>
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
