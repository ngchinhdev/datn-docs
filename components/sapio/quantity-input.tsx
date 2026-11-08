'use client';

import { Minus, Plus } from 'lucide-react';
import { useState } from 'react';

/**
 * − number + for a small count. `noun` completes the button names: "Bớt một ghế cắt". Give the
 * visible label `htmlFor={id}`. Typing is free; the value is clamped to the range on blur.
 */
export function QuantityInput({
  id,
  noun,
  value,
  min,
  max,
  onChange,
}: {
  id: string;
  noun: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const clamp = (n: number) => Math.min(max, Math.max(min, n));

  return (
    <span className="sp-qty">
      <button
        type="button"
        aria-label={`Bớt một ${noun}`}
        disabled={value <= min}
        onClick={() => onChange(clamp(value - 1))}
      >
        <Minus aria-hidden="true" />
      </button>
      <input
        id={id}
        inputMode="numeric"
        autoComplete="off"
        value={draft ?? String(value)}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, '').slice(0, 3);
          setDraft(digits);
          if (digits) onChange(clamp(Number(digits)));
        }}
        onBlur={() => setDraft(null)}
      />
      <button
        type="button"
        aria-label={`Thêm một ${noun}`}
        disabled={value >= max}
        onClick={() => onChange(clamp(value + 1))}
      >
        <Plus aria-hidden="true" />
      </button>
    </span>
  );
}
