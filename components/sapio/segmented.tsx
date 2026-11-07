'use client';

import Link from 'next/link';
import { useRef, type KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';

const rootClass = (size: 'md' | 'lg', block: boolean) =>
  cn('sp-segmented', size === 'lg' && 'sp-segmented--lg', block && 'sp-segmented--block');

export interface SegmentedLink {
  href: string;
  label: string;
  current: boolean;
}

/** Switches pages (Nhân viên / Tài nguyên): a nav of links with `aria-current`. */
export function SegmentedNav({
  label,
  items,
  size = 'md',
  block = false,
}: {
  label: string;
  items: SegmentedLink[];
  size?: 'md' | 'lg';
  block?: boolean;
}) {
  return (
    <nav aria-label={label} className={rootClass(size, block)}>
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={item.current ? 'page' : undefined}
          className="sp-segmented__item no-underline"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

export interface SegmentedTab {
  value: string;
  label: string;
  /** Number of choices inside, e.g. free slots in the part of day. */
  count?: number;
  disabled?: boolean;
}

/** Switches content in the page (Sáng / Chiều / Tối): tablist, arrow keys move. */
export function SegmentedTabs({
  label,
  items,
  value,
  onChange,
  size = 'md',
  block = false,
  controls,
}: {
  label: string;
  items: SegmentedTab[];
  value: string;
  onChange: (value: string) => void;
  size?: 'md' | 'lg';
  block?: boolean;
  /** id of the panel the tabs control. */
  controls?: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(e: KeyboardEvent, index: number) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const step = e.key === 'ArrowRight' ? 1 : -1;
    for (let i = 1; i <= items.length; i++) {
      const next = (index + step * i + items.length) % items.length;
      const item = items[next];
      if (item && !item.disabled) {
        onChange(item.value);
        refs.current[next]?.focus();
        return;
      }
    }
  }

  return (
    <div role="tablist" aria-label={label} className={rootClass(size, block)}>
      {items.map((item, i) => {
        const selected = item.value === value;
        return (
          <button
            key={item.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={controls}
            tabIndex={selected ? 0 : -1}
            disabled={item.disabled}
            className="sp-segmented__item"
            onClick={() => onChange(item.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
          >
            {item.label}
            {item.count !== undefined && <span className="sp-segmented__count">{item.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
