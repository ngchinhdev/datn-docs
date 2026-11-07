'use client';

import { X } from 'lucide-react';
import { useEffect, useId, useRef, type ReactNode } from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Bottom sheet for phones (`.sp-sheet`): focus stays inside, Escape or the scrim closes. */
export function Sheet({
  open,
  title,
  onClose,
  footer,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  footer?: ReactNode;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const sheet = ref.current;
    sheet?.querySelector<HTMLElement>(FOCUSABLE)?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
      if (e.key !== 'Tab' || !sheet) return;
      const nodes = [...sheet.querySelectorAll<HTMLElement>(FOCUSABLE)];
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (!first || !last) return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      opener?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <>
      <div className="sp-scrim z-50" onClick={onClose} aria-hidden="true" />
      <section
        ref={ref}
        className="sp-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="sp-sheet__handle" aria-hidden="true" />
        <div className="sp-sheet__head">
          <h2 className="sp-sheet__title" id={titleId}>
            {title}
          </h2>
          <button
            type="button"
            className="sp-icon-btn size-11!"
            aria-label="Đóng"
            onClick={onClose}
          >
            <X aria-hidden="true" />
          </button>
        </div>
        <div className="sp-sheet__body">{children}</div>
        {footer && <div className="sp-sheet__foot">{footer}</div>}
      </section>
    </>
  );
}
