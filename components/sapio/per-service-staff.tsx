'use client';

import { useState } from 'react';
import { Button } from './button';
import { Field } from './form';
import { Sheet } from './sheet';

export interface PerServiceRow {
  /** Key of the service in the chain. */
  id: string;
  /** "1. Nhuộm tóc · Tóc ngắn". */
  label: string;
  /** "Bất kỳ ai" first, then each person with the price they charge (BR-56). */
  options: { value: string; label: string }[];
  value: string;
  help?: string;
}

/** "Thợ cho từng dịch vụ" (MH-13): one select per service, applied on "Xong". */
export function PerServiceStaff({
  open,
  title,
  rows,
  note,
  onClose,
  onApply,
}: {
  open: boolean;
  title: string;
  rows: PerServiceRow[];
  note: string;
  onClose: () => void;
  onApply: (values: Record<string, string>) => void;
}) {
  return (
    <PerServiceBody
      key={String(open)}
      open={open}
      title={title}
      rows={rows}
      note={note}
      onClose={onClose}
      onApply={onApply}
    />
  );
}

/** Keyed by `open` so each opening starts from the saved choices. */
function PerServiceBody({
  open,
  title,
  rows,
  note,
  onClose,
  onApply,
}: Parameters<typeof PerServiceStaff>[0]) {
  const [draft, setDraft] = useState<Record<string, string>>(() =>
    Object.fromEntries(rows.map((r) => [r.id, r.value])),
  );
  return (
    <Sheet
      open={open}
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Hủy
          </Button>
          <Button
            variant="accent"
            onClick={() => {
              onApply(draft);
              onClose();
            }}
          >
            Xong
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-(--space-4)">
        {rows.map((row) => (
          <Field key={row.id} id={`per-${row.id}`} size="md" label={row.label} help={row.help}>
            <select
              id={`per-${row.id}`}

              value={draft[row.id]}
              onChange={(e) => setDraft((d) => ({ ...d, [row.id]: e.target.value }))}
            >
              {row.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
        ))}
        <p className="body-sm m-0 text-(--ink-muted)">{note}</p>
      </div>
    </Sheet>
  );
}
