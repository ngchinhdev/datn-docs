export interface PlanItem {
  id: string;
  /** "14:00–15:45". */
  time: string;
  /** "Nhuộm tóc · Tóc ngắn". */
  title: string;
  /** "Lan · có 45 phút chờ lên màu". */
  note: string;
}

/** "Lịch của bạn" (MH-13): each item of the chain with its time, person and waits. */
export function ChainPlan({
  heading,
  items,
  footer,
}: {
  heading: string;
  items: PlanItem[];
  footer?: string;
}) {
  return (
    <section
      aria-labelledby="plan-title"
      className="rounded-(--radius-lg) bg-(--surface-raised) px-(--space-4) py-(--space-3) shadow-[0_0_0_1px_var(--line)]"
    >
      <h2 id="plan-title" className="body m-0 mb-(--space-1) font-semibold">
        {heading}
      </h2>
      <ol className="m-0 list-none p-0">
        {items.map((item) => (
          <li
            key={item.id}
            className="body-sm grid grid-cols-[6.5rem_1fr] gap-(--space-2) py-(--space-1)"
          >
            <span className="sp-num text-(--ink-muted)">{item.time}</span>
            <span className="flex flex-col">
              <span className="font-medium">{item.title}</span>
              {item.note && <span className="text-(--ink-muted)">{item.note}</span>}
            </span>
          </li>
        ))}
      </ol>
      {footer && <p className="body-sm m-0 mt-(--space-1) text-(--ink-muted)">{footer}</p>}
    </section>
  );
}
