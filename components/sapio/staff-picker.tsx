'use client';

import { ChevronRight, Users, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from './button';

import { ANY_STAFF } from '@/mock/availability';

export { ANY_STAFF };

export interface StaffOption {
  id: string;
  /** Public profile only (BR-15). */
  displayName: string;
  title: string;
  specialty: string;
  /** "Sớm nhất 09:45"; `null` when fully booked on the day being viewed. */
  earliest: string | null;
  /** Shown under "Hết giờ ngày này", e.g. "Sớm nhất CN 08/11". */
  nextDay?: string | undefined;
}

export interface StaffPickerProps {
  options: StaffOption[];
  /** `ANY_STAFF` or a staff id. */
  value: string;
  onChange: (value: string) => void;
  /** "Thợ làm được Nhuộm tóc · Thứ Bảy 07/11". */
  context: string;
  /** Earliest slot for "Bất kỳ ai". */
  anyEarliest: string | null;
  /** Word for staff in this tenant, e.g. "Thợ". */
  noun: string;
}

/** Avatar tints cycle through the status soft colors; they carry no meaning here. */
const AVATAR_TINTS = [
  'bg-(--status-checked-in-soft) text-(--status-checked-in)',
  'bg-(--status-confirmed-soft) text-(--status-confirmed)',
  'bg-(--status-no-show-soft) text-(--status-no-show)',
  'bg-(--status-completed-soft) text-(--status-completed)',
];

function Avatar({ name, index, dim }: { name: string; index: number; dim?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'heading flex size-11 flex-none items-center justify-center rounded-(--radius-pill) font-bold',
        dim
          ? 'bg-(--surface-raised) text-(--ink-muted)'
          : AVATAR_TINTS[index % AVATAR_TINTS.length],
      )}
    >
      {name.charAt(0)}
    </span>
  );
}

/** "Bất kỳ ai · Đổi" row plus a bottom sheet (BR-14): "Bất kỳ ai" first and preselected. */
export function StaffPicker({
  options,
  value,
  onChange,
  context,
  anyEarliest,
  noun,
}: StaffPickerProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const titleId = useId();
  const sheetRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const chosen = options.find((o) => o.id === value);

  useEffect(() => {
    if (!open) return;
    sheetRef.current?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  function close() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  const rows = [
    {
      id: ANY_STAFF,
      name: 'Bất kỳ ai',
      sub: `Xếp ${noun.toLowerCase()} trống sớm nhất, nhiều giờ để chọn nhất`,
      right: anyEarliest,
      full: false,
      nextDay: undefined as string | undefined,
    },
    ...options.map((o) => ({
      id: o.id,
      name: o.displayName,
      sub: `${o.title} · ${o.specialty}`,
      right: o.earliest,
      full: o.earliest === null,
      nextDay: o.nextDay,
    })),
  ];

  return (
    <div className="flex flex-col gap-(--space-2)">
      <span className="label text-(--ink-muted)">{noun}</span>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        onClick={() => {
          setDraft(value);
          setOpen(true);
        }}
        className="flex items-center gap-(--space-3) rounded-(--radius-md) border-0 bg-(--fill-tonal) px-(--space-3) py-(--space-2) text-left text-(--ink) hover:bg-(--surface-hover) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
      >
        {chosen ? (
          <Avatar name={chosen.displayName} index={options.indexOf(chosen)} />
        ) : (
          <span
            aria-hidden="true"
            className="flex size-11 flex-none items-center justify-center rounded-(--radius-pill) bg-(--surface-raised) text-(--accent)"
          >
            <Users size={20} />
          </span>
        )}
        <span className="flex min-w-0 grow flex-col">
          <span className="body font-semibold">{chosen ? chosen.displayName : 'Bất kỳ ai'}</span>
          <span className="body-sm text-(--ink-muted)">
            {chosen
              ? `${chosen.title} · ${chosen.specialty}`
              : `Xếp ${noun.toLowerCase()} trống sớm nhất`}
          </span>
        </span>
        <span className="body-sm flex items-center gap-0.5 font-semibold text-(--accent)">
          Đổi
          <ChevronRight size={16} aria-hidden="true" />
        </span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-(--surface) opacity-70"
            onClick={close}
          />
          <div
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative flex w-full max-w-[560px] flex-col gap-(--space-3) rounded-t-(--radius-lg) bg-(--surface-raised) px-(--space-4) pt-(--space-2) pb-(--space-6) shadow-(--shadow-popover)"
          >
            <span
              aria-hidden="true"
              className="h-1 w-9 self-center rounded-(--radius-pill) bg-(--fill-tonal)"
            />
            <div className="flex items-start gap-(--space-2)">
              <div className="flex grow flex-col gap-0.5">
                <h2 id={titleId} className="heading m-0">
                  Chọn {noun.toLowerCase()}
                </h2>
                <span className="body-sm text-(--ink-muted)">{context}</span>
              </div>
              <Button variant="ghost" aria-label="Đóng" onClick={close} className="size-11 p-0">
                <X size={20} aria-hidden="true" />
              </Button>
            </div>
            <div className="flex flex-col gap-(--space-2)" role="radiogroup" aria-label={noun}>
              {rows.map((row, i) => {
                const checked = row.id === draft;
                return (
                  <button
                    key={row.id}
                    type="button"
                    role="radio"
                    aria-checked={checked}
                    onClick={() => setDraft(row.id)}
                    className={cn(
                      'flex min-h-16 items-center gap-(--space-3) rounded-(--radius-md) border-0 px-(--space-4) py-(--space-2) text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)',
                      checked
                        ? 'bg-(--accent-soft) text-(--ink) shadow-[inset_0_0_0_1.5px_var(--accent)]'
                        : 'bg-(--fill-tonal) hover:bg-(--surface-hover)',
                      row.full ? 'text-(--ink-muted)' : 'text-(--ink)',
                    )}
                  >
                    {row.id === ANY_STAFF ? (
                      <span
                        aria-hidden="true"
                        className="flex size-11 flex-none items-center justify-center rounded-(--radius-pill) bg-(--surface-raised) text-(--accent)"
                      >
                        <Users size={20} />
                      </span>
                    ) : (
                      <Avatar name={row.name} index={i - 1} dim={row.full} />
                    )}
                    <span className="flex min-w-0 grow flex-col">
                      <span className="body font-semibold">{row.name}</span>
                      <span className={cn('body-sm', !row.full && 'text-(--ink-muted)')}>
                        {row.sub}
                      </span>
                    </span>
                    <span
                      className={cn(
                        'body-sm sp-num text-right',
                        row.id === ANY_STAFF ? 'font-semibold' : !row.full && 'text-(--ink-muted)',
                      )}
                    >
                      {row.full ? (
                        <>
                          Hết giờ ngày này
                          {row.nextDay && (
                            <>
                              <br />
                              {row.nextDay}
                            </>
                          )}
                        </>
                      ) : row.id === ANY_STAFF ? (
                        row.right
                      ) : (
                        `Sớm nhất ${row.right}`
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
            <Button
              variant="accent"
              size="lg"
              block
              onClick={() => {
                onChange(draft);
                close();
              }}
            >
              Xong
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
