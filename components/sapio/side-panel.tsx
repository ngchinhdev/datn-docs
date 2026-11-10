'use client';

import { X } from 'lucide-react';
import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Sheet } from './sheet';
import { useMediaQuery } from './use-media-query';

/**
 * The panel beside the reception calendar (`aside.sp-side`): create an appointment, edit a shift.
 * The calendar stays visible and pressable. From 1200px it is a column of the page; from 768px
 * a drawer over the right edge; below that a bottom sheet with the same content.
 */
export function SidePanel({
  title,
  onClose,
  footer,
  children,
  className,
}: {
  title: string;
  onClose: () => void;
  /** Buttons at the foot, usually "Hủy" and the main action. */
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const titleId = useId();
  const phone = useMediaQuery('(max-width: 767px)', false);

  if (phone) {
    return (
      <Sheet open title={title} onClose={onClose} footer={footer}>
        <div className="flex flex-col gap-(--space-4)">{children}</div>
      </Sheet>
    );
  }
  return (
    <>
      <div aria-hidden="true" className="sp-scrim z-40 min-[1200px]:hidden" onClick={onClose} />
      <aside
        aria-labelledby={titleId}
        className={cn(
          'sp-side',
          'fixed top-(--space-4) right-(--space-4) bottom-(--space-4) z-50 overflow-y-auto',
          'min-[1200px]:static min-[1200px]:z-auto min-[1200px]:overflow-visible',
          className,
        )}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.stopPropagation();
            onClose();
          }
        }}
      >
        <div className="sp-side__head">
          <h2 className="sp-side__title" id={titleId}>
            {title}
          </h2>
          <button type="button" className="sp-icon-btn" aria-label="Đóng" onClick={onClose}>
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        {children}
        {footer && <div className="sp-side__foot">{footer}</div>}
      </aside>
    </>
  );
}
