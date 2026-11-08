'use client';

import { Check } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Button } from './button';

/** `form.sp-form`: sections one under the other, the save bar sticks to the bottom. */
export function Form({ className, ...props }: ComponentProps<'form'>) {
  return <form noValidate className={cn('sp-form', className)} {...props} />;
}

/** Title and a short explanation on the left (with the BR it follows), the fields on the right. */
export function FormSection({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="sp-form-section" aria-labelledby={id}>
      <div>
        <h2 className="sp-form-section__title" id={id}>
          {title}
        </h2>
        <p className="sp-form-section__desc">{description}</p>
      </div>
      <div className="sp-form-section__fields">{children}</div>
    </section>
  );
}

/**
 * Label, control and one line under it: the explanation, or the error that replaces it.
 * Required fields carry no mark; optional ones say so.
 */
export function Field({
  id,
  label,
  optional = false,
  help,
  error,
  ok = false,
  suffix,
  live = false,
  full = false,
  size = 'sm',
  area = false,
  children,
}: {
  id: string;
  label: string;
  optional?: boolean;
  help?: ReactNode;
  error?: string | null | undefined;
  /** The value passed a check that took time (address is free): help turns green with a tick. */
  ok?: boolean;
  /** Fixed text after the input inside the box: ".sapio.vn". */
  suffix?: string;
  /** The line under the field is read out when it changes (a check that runs while typing). */
  live?: boolean;
  /** Spans both columns of the section. */
  full?: boolean;
  /** `sm` is the admin density (40px), `md` the customer pages (48px). */
  size?: 'sm' | 'md';
  /** The control is a textarea. */
  area?: boolean;
  /** The input, select or textarea; give it `id`, and `aria-invalid` when there is an error. */
  children: ReactNode;
}) {
  const message = error ?? help;
  return (
    <div
      className={cn(
        'sp-field',
        size === 'sm' && 'sp-field--sm',
        error && 'sp-field--error',
        ok && !error && 'sp-field--ok',
        full && 'sp-field--full',
      )}
    >
      <label className="sp-field__label" htmlFor={id}>
        {label}
        {optional && <span className="sp-field__optional"> (không bắt buộc)</span>}
      </label>
      <div className={cn('sp-field__control', area && 'sp-field__control--area')}>
        {children}
        {suffix && (
          <span className="sp-field__suffix flex items-center self-stretch border-l border-(--line)">
            {suffix}
          </span>
        )}
      </div>
      {message && (
        <span
          id={`${id}-help`}
          className="sp-field__help"
          {...(live ? { 'aria-live': 'polite' as const } : {})}
        >
          {ok && !error && <Check size={14} aria-hidden="true" className="me-1 inline" />}
          {message}
        </span>
      )}
    </div>
  );
}

/** A setting that takes effect when saved: "Nhận đặt lịch online". */
export function SwitchRow({
  label,
  hint,
  checked,
  onChange,
  full = true,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  full?: boolean;
}) {
  return (
    <label className={cn('sp-switch', full && 'sp-field--full')}>
      <span>
        {label}
        {hint && <span className="sp-check__hint">{hint}</span>}
      </span>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}

/** One of several choices that can be on together (skills, days of the week). */
export function CheckRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="sp-check">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        {label}
        {hint && <span className="sp-check__hint">{hint}</span>}
      </span>
    </label>
  );
}

/** Appears only when something changed; says how many, and offers to drop or keep them. */
export function SaveBar({
  count,
  onDiscard,
  note,
  saveDisabled = false,
}: {
  count: number;
  onDiscard: () => void;
  /** After the count: what saving does not touch, e.g. appointments already booked. */
  note?: ReactNode;
  /** The form still has errors: the button is off and says why through `note`. */
  saveDisabled?: boolean;
}) {
  if (count === 0) return null;
  return (
    <div className="sp-savebar max-md:bottom-22!" role="region" aria-label="Lưu thay đổi">
      <span aria-live="polite">
        Còn {count} thay đổi chưa lưu{note && <> · {note}</>}
      </span>
      <span className="sp-savebar__actions">
        <Button variant="ghost" onClick={onDiscard}>
          Bỏ thay đổi
        </Button>
        <Button type="submit" variant="primary" disabled={saveDisabled}>
          Lưu
        </Button>
      </span>
    </div>
  );
}
