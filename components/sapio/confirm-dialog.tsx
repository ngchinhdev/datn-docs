'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Button } from './button';

export interface ConfirmFact {
  term: string;
  value: string;
  /** Last line with a rule above, e.g. "Còn phải thu". */
  total?: boolean;
}

export interface ConfirmDialogProps {
  open: boolean;
  /** Verb, object and number: "Thu 400.000 ₫ của chị Hà?". */
  title: string;
  body?: ReactNode;
  facts?: ConfirmFact[];
  /** Extra controls between the facts and the buttons, e.g. payment method. */
  children?: ReactNode;
  /** Repeats the verb: "Thu 400.000 ₫", "Hủy lịch". */
  confirmLabel: string;
  /** Shown while `onConfirm` runs: "Đang thu…". */
  pendingLabel?: string;
  tone?: 'primary' | 'danger';
  /** Label of the button that leaves things as they were; "Quay lại" by default. */
  backLabel?: string;
  /** The main button is off until the controls in `children` are valid. */
  confirmDisabled?: boolean;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}

/** Asks again before an action about money or one that is hard to undo (D-14). */
export function ConfirmDialog({
  open,
  title,
  body,
  facts,
  children,
  confirmLabel,
  pendingLabel,
  tone = 'primary',
  backLabel = 'Quay lại',
  confirmDisabled = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const backRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const [pending, setPending] = useState(false);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      openerRef.current = document.activeElement as HTMLElement | null;
      dialog.showModal();
      backRef.current?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
      openerRef.current?.focus();
    }
  }, [open]);

  // Unmounting while open (parent stops rendering it) still returns focus to the opener.
  useEffect(() => () => openerRef.current?.focus(), []);

  async function confirm() {
    setPending(true);
    try {
      await onConfirm();
    } finally {
      setPending(false);
    }
  }

  return (
    <dialog
      ref={ref}
      className="sp-dialog"
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        if (!pending) onClose();
      }}
      onClick={(e) => {
        // The backdrop belongs to the dialog element; only clicks outside its box count.
        const r = e.currentTarget.getBoundingClientRect();
        const outside =
          e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
        if (e.target === e.currentTarget && outside && !pending) onClose();
      }}
    >
      <h2 id={titleId} className="sp-dialog__title">
        {title}
      </h2>
      {body && <p className="sp-dialog__body">{body}</p>}
      {facts && facts.length > 0 && (
        <dl className="sp-dialog__facts">
          {facts.map((f) => (
            <div key={f.term} className="contents">
              <dt className={f.total ? 'sp-dialog__total' : undefined}>{f.term}</dt>
              <dd className={f.total ? 'sp-dialog__total' : undefined}>{f.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {children}
      <div className="sp-dialog__actions">
        <Button ref={backRef} variant="secondary" disabled={pending} onClick={onClose}>
          {backLabel}
        </Button>
        <Button variant={tone} disabled={pending || confirmDisabled} onClick={confirm}>
          {pending ? (pendingLabel ?? confirmLabel) : confirmLabel}
        </Button>
      </div>
    </dialog>
  );
}
