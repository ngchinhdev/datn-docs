'use client';

import { useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

type Side = 'bottom' | 'right' | 'top-end' | 'bottom-end';

/** Fixed position next to the control, so a scrolling or clipping parent (the sidebar) cannot cut it or grow a scrollbar. */
function place(rect: DOMRect, side: Side): CSSProperties {
  switch (side) {
    case 'bottom':
      return {
        left: rect.left + rect.width / 2,
        top: rect.bottom + 6,
        transform: 'translateX(-50%)',
      };
    case 'right':
      return {
        left: rect.right + 8,
        top: rect.top + rect.height / 2,
        transform: 'translateY(-50%)',
      };
    case 'top-end':
      return { right: window.innerWidth - rect.right, bottom: window.innerHeight - rect.top + 6 };
    case 'bottom-end':
      return { right: window.innerWidth - rect.right, top: rect.bottom + 6 };
  }
}

/**
 * `.sp-tooltip` for an icon-only control; the control keeps its own `aria-label`.
 * The `-end` sides line the tooltip up with the control's right edge.
 */
export function Tip({
  label,
  side = 'bottom',
  enabled = true,
  children,
}: {
  label: string;
  side?: Side;
  /** Off when the label is already visible, e.g. a full sidebar. */
  enabled?: boolean;
  children: ReactNode;
}) {
  const [style, setStyle] = useState<CSSProperties | null>(null);
  const ref = useRef<HTMLSpanElement>(null);
  const show = () => {
    const rect = ref.current?.getBoundingClientRect();
    if (rect) setStyle(place(rect, side));
  };
  const hide = () => setStyle(null);

  return (
    <span
      ref={ref}
      className="relative inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      onKeyDown={(e) => e.key === 'Escape' && hide()}
    >
      {children}
      {enabled &&
        style &&
        createPortal(
          <span aria-hidden="true" className="sp-tooltip fixed" style={style}>
            {label}
          </span>,
          document.body,
        )}
    </span>
  );
}
