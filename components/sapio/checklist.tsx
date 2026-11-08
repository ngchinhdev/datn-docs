import { Check, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export interface ChecklistItem {
  label: string;
  /** Short figure on the right: "5 dịch vụ". */
  meta?: string;
  done: boolean;
  /** The page where the task is done. */
  href: string;
}

/** Tasks with a done or not-done mark, each a link to the page that does it (Checklist README). */
export function Checklist({ items }: { items: ChecklistItem[] }) {
  return (
    <ol className="sp-checklist">
      {items.map((item) => (
        <li key={item.label}>
          <Link
            href={item.href}
            className="sp-checklist__item"
            data-done={item.done ? '' : undefined}
          >
            <span className="sp-checklist__mark" aria-hidden="true">
              {item.done && <Check />}
            </span>
            <span className="sp-checklist__label">
              <span className="sp-sr-only">{item.done ? 'Đã xong: ' : 'Chưa xong: '}</span>
              {item.label}
            </span>
            <span className="sp-checklist__meta">{item.meta}</span>
            <ChevronRight size={16} aria-hidden="true" />
          </Link>
        </li>
      ))}
    </ol>
  );
}
