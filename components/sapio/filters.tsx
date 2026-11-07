'use client';

import { ChevronDown, Search, X } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useMenu } from './use-menu';

/** Search box that applies as you type; `value` is the one in the URL. */
export function SearchField({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [text, setText] = useState(value);
  const sent = useRef(value);

  // A change that did not come from typing here (Bỏ lọc, back button) replaces the text.
  useEffect(() => {
    if (value !== sent.current) {
      sent.current = value;
      setText(value);
    }
  }, [value]);

  return (
    <label className="sp-search max-md:h-11! max-md:max-w-none!">
      <Search size={16} aria-hidden="true" />
      <input
        type="search"
        placeholder={placeholder}
        aria-label={label}
        value={text}
        className="max-md:text-base"
        onChange={(e) => {
          setText(e.target.value);
          sent.current = e.target.value;
          onChange(e.target.value);
        }}
      />
    </label>
  );
}

/** A quick filter that is either on or off. */
export function FilterChip({
  pressed,
  onToggle,
  children,
}: {
  pressed: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <button type="button" className="sp-chip" aria-pressed={pressed} onClick={onToggle}>
      {children}
    </button>
  );
}

/** A quick filter with one value out of a list, picked in a menu. */
export function ChipMenu({
  label,
  value,
  allLabel,
  options,
  onChange,
}: {
  label: string;
  value: string;
  /** Text of the choice that means no filter. */
  allLabel: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  const menu = useMenu();
  const choices = [{ value: '', label: allLabel }, ...options];
  const current = choices.find((c) => c.value === value) ?? choices[0]!;
  return (
    <div className="relative">
      <button
        ref={menu.triggerRef}
        type="button"
        className="sp-chip"
        aria-pressed={value !== ''}
        aria-haspopup="menu"
        aria-expanded={menu.open}
        onClick={() => menu.setOpen((v) => !v)}
        onKeyDown={menu.onTriggerKeyDown}
      >
        {label} <span className="sp-chip__value">{current.label}</span>
        <ChevronDown size={14} aria-hidden="true" />
      </button>
      {menu.open && (
        <div
          ref={menu.menuRef}
          className="sp-menu absolute top-[calc(100%+4px)] left-0 z-30"
          role="menu"
          aria-label={label}
          onKeyDown={menu.onKeyDown}
        >
          {choices.map((choice) => (
            <button
              key={choice.value}
              type="button"
              role="menuitemradio"
              aria-checked={choice.value === value}
              className="sp-menu__item"
              onClick={() => {
                menu.close();
                onChange(choice.value);
              }}
            >
              {choice.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Filters that are on, as chips with a ✕, under the search box on phones. */
export function ActiveFilters({
  items,
  trailing,
}: {
  items: { key: string; label: string; onRemove: () => void }[];
  /** First in the row: the button that opens the filter sheet. */
  trailing?: ReactNode;
}) {
  return (
    <div className="sp-chips">
      {trailing}
      {items.map((item) => (
        <span key={item.key} className="sp-chip sp-chip--removable">
          {item.label}
          <button
            type="button"
            className="sp-chip__remove"
            aria-label={`Bỏ lọc ${item.label}`}
            onClick={item.onRemove}
          >
            <X aria-hidden="true" />
          </button>
        </span>
      ))}
    </div>
  );
}

/** Number on the "Bộ lọc" button. */
export function Count({ value, className }: { value: number; className?: string }) {
  return value > 0 ? <span className={cn('sp-count', className)}>{value}</span> : null;
}
