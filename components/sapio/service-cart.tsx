import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { Button } from './button';

export interface CartItem {
  id: string;
  /** "Nhuộm tóc". */
  name: string;
  /** "Tóc ngắn · 1 giờ 45 phút · 500.000 ₫". */
  detail: string;
}

/** "Làm theo thứ tự" (MH-13): the chosen services in the order they are done. */
export function ServiceCart({
  items,
  max,
  onMove,
  onRemove,
  note,
}: {
  items: CartItem[];
  max: number;
  onMove: (id: string, by: -1 | 1) => void;
  onRemove: (id: string) => void;
  note: string;
}) {
  return (
    <section
      aria-labelledby="cart-title"
      className="flex flex-col gap-(--space-2) rounded-(--radius-lg) bg-(--surface-raised) px-(--space-4) py-(--space-3) shadow-[0_0_0_1.5px_var(--accent)]"
    >
      <div className="flex items-baseline justify-between">
        <h2 id="cart-title" className="body m-0 font-semibold">
          Làm theo thứ tự
        </h2>
        <span className="body-sm sp-num text-(--ink-muted)">
          {items.length}/{max} dịch vụ
        </span>
      </div>
      <ol className="m-0 list-none p-0">
        {items.map((item, i) => (
          <li
            key={item.id}
            className="flex items-center gap-(--space-2) border-t border-(--line) py-(--space-2)"
          >
            <span
              aria-hidden="true"
              className="body-sm sp-num flex size-6 flex-none items-center justify-center rounded-(--radius-pill) bg-(--accent) font-semibold text-(--on-accent)"
            >
              {i + 1}
            </span>
            <span className="flex min-w-0 grow flex-col">
              <span className="body truncate font-medium">{item.name}</span>
              <span className="body-sm sp-num text-(--ink-muted)">{item.detail}</span>
            </span>
            <Button
              variant="ghost"
              aria-label={`Đưa ${item.name} lên trước`}
              disabled={i === 0}
              className="size-11! p-0!"
              onClick={() => onMove(item.id, -1)}
            >
              <ChevronUp size={18} aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              aria-label={`Đưa ${item.name} xuống sau`}
              disabled={i === items.length - 1}
              className="size-11! p-0!"
              onClick={() => onMove(item.id, 1)}
            >
              <ChevronDown size={18} aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              aria-label={`Bỏ ${item.name}`}
              className="size-11! p-0!"
              onClick={() => onRemove(item.id)}
            >
              <Trash2 size={18} aria-hidden="true" />
            </Button>
          </li>
        ))}
      </ol>
      {note && <p className="body-sm m-0 text-(--ink-muted)">{note}</p>}
    </section>
  );
}
