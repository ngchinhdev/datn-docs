import { cn } from '@/lib/utils';

export interface PhoneFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string | null;
  help?: string;
}

export function PhoneField({ id, label, value, onChange, onBlur, error, help }: PhoneFieldProps) {
  const helpId = `${id}-help`;
  const message = error ?? help;
  return (
    <div className={cn('sp-field', error && 'sp-field--error')}>
      <label className="sp-field__label" htmlFor={id}>
        {label}
      </label>
      <div className="sp-field__control">
        <span className="sp-field__prefix" aria-hidden="true">
          +84
        </span>
        <input
          id={id}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          placeholder="Ví dụ: 0912 345 678"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          aria-invalid={error ? true : undefined}
          aria-describedby={message ? helpId : undefined}
        />
      </div>
      {message && (
        <span id={helpId} className="sp-field__help">
          {message}
        </span>
      )}
    </div>
  );
}
