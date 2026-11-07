'use client';

import { useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

const TIP_POSITION = {
  bottom: 'top-[calc(100%+6px)] left-1/2 -translate-x-1/2',
  right: 'top-1/2 left-[calc(100%+8px)] -translate-y-1/2',
  'top-end': 'bottom-[calc(100%+6px)] right-0',
  'bottom-end': 'top-[calc(100%+6px)] right-0',
} as const;

/** `.sp-tooltip` for an icon-only control; the control keeps its own `aria-label`. */
export function Tip({
  label,
  side = 'bottom',
  enabled = true,
  children,
}: {
  label: string;
  /** The `-end` sides line the tooltip up with the right edge, for controls at the edge of a box that clips. */
  side?: 'bottom' | 'right' | 'top-end' | 'bottom-end';
  /** Off when the label is already visible, e.g. a full sidebar. */
  enabled?: boolean;
  children: ReactNode;
}) {
  const [shown, setShown] = useState(false);
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setShown(true)}
      onMouseLeave={() => setShown(false)}
      onFocus={() => setShown(true)}
      onBlur={() => setShown(false)}
      onKeyDown={(e) => e.key === 'Escape' && setShown(false)}
    >
      {children}
      {enabled && shown && (
        <span aria-hidden="true" className={cn('sp-tooltip', TIP_POSITION[side])}>
          {label}
        </span>
      )}
    </span>
  );
}
