'use client';

import { X } from 'lucide-react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { cn } from '@/lib/utils';

export interface ToastInput {
  /** Finished action with object and time: "Đã check-in chị Ngọc lúc 10:20." */
  text: string;
  /** Adds "Hoàn tác" for 5 seconds. */
  undo?: () => void;
  tone?: 'info' | 'danger';
  /** Danger toasts that need action stay until closed. */
  persist?: boolean;
}

interface ToastItem extends ToastInput {
  id: number;
}

const ToastContext = createContext<((t: ToastInput) => void) | null>(null);

const MAX = 3;
const UNDO_MS = 5000;
const INFO_MS = 4000;

function ToastView({
  item,
  onExpire,
  onUndo,
}: {
  item: ToastItem;
  onExpire: (id: number) => void;
  onUndo: (item: ToastItem) => void;
}) {
  const [paused, setPaused] = useState(false);
  const left = useRef(item.undo ? UNDO_MS : INFO_MS);

  // Counts down only while not hovered or focused.
  useEffect(() => {
    if (paused || item.persist) return;
    const startedAt = performance.now();
    const id = setTimeout(() => onExpire(item.id), left.current);
    return () => {
      clearTimeout(id);
      left.current -= performance.now() - startedAt;
    };
  }, [paused, item, onExpire]);

  return (
    <div
      className={cn('sp-toast', item.tone === 'danger' && 'sp-toast--danger')}
      role={item.tone === 'danger' ? 'alert' : undefined}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <span className="sp-toast__text">{item.text}</span>
      {item.undo && (
        <button type="button" className="sp-toast__action" onClick={() => onUndo(item)}>
          Hoàn tác
        </button>
      )}
      {item.persist && (
        <button
          type="button"
          className="sp-icon-btn size-7!"
          aria-label="Đóng"
          onClick={() => onExpire(item.id)}
        >
          <X aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

/** One `.sp-toast-region` per page; mounted once in the `/mock` layout. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const show = useCallback((t: ToastInput) => {
    const id = nextId.current++;
    setItems((list) => [...list, { ...t, id }].slice(-MAX));
  }, []);
  const remove = useCallback((id: number) => {
    setItems((list) => list.filter((t) => t.id !== id));
  }, []);
  const undo = useCallback(
    (item: ToastItem) => {
      item.undo?.();
      remove(item.id);
      show({ text: 'Đã hoàn tác.' });
    },
    [remove, show],
  );

  return (
    <ToastContext.Provider value={show}>
      {children}
      {/* Sits above the phone bottom nav on pages that have one. */}
      <div
        className="sp-toast-region in-[body:has([data-phone-nav])]:max-md:bottom-20 in-[body:has(.sp-savebar)]:bottom-28! in-[body:has(.sp-savebar)]:max-md:bottom-44!"
        role="status"
        aria-live="polite"
      >
        {items.map((item) => (
          <ToastView key={item.id} item={item} onExpire={remove} onUndo={undo} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const show = useContext(ToastContext);
  if (!show) throw new Error('useToast() needs <ToastProvider>');
  return show;
}
