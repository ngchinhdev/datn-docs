import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * A form with a preview beside it (DetailPage): the form on the left, `aside` on the right with
 * panels that only show things (no inputs). Narrower than about 1000px the aside goes below.
 */
export function DetailLayout({
  main,
  side,
  sideLabel,
  className,
  ...form
}: {
  main: ReactNode;
  side: ReactNode;
  /** Name of the aside, e.g. "Xem trước". */
  sideLabel: string;
} & Omit<ComponentProps<'form'>, 'children'>) {
  return (
    <div className="sp-detail">
      <form noValidate className={cn('sp-form sp-detail__main', className)} {...form}>
        {main}
      </form>
      <aside className="sp-detail__side" aria-label={sideLabel}>
        {side}
      </aside>
    </div>
  );
}

/** A box in the aside: a title, what it shows, and one line of note. */
export function Panel({
  title,
  titleId,
  note,
  level = 2,
  children,
}: {
  title: string;
  titleId: string;
  note?: ReactNode;
  level?: 2 | 3;
  children?: ReactNode;
}) {
  const Heading = level === 2 ? 'h2' : 'h3';
  return (
    <section className="sp-panel" aria-labelledby={titleId}>
      <Heading className="sp-panel__title" id={titleId}>
        {title}
      </Heading>
      {children}
      {note && <p className="sp-panel__note">{note}</p>}
    </section>
  );
}

/** Two columns of term and number: the term left, the value right with tabular figures. */
export function KeyValueList({ items }: { items: [term: string, value: ReactNode][] }) {
  return (
    <dl className="sp-kv">
      {items.map(([term, value]) => (
        <div key={term} className="contents">
          <dt>{term}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
