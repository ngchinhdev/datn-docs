import Link from 'next/link';
import { LockIcon } from './lock-icon';

/** The menu of the settings pages; hidden below 900px, where `/settings` lists the sections. */
export function SettingsNav({
  items,
}: {
  items: { id: string; label: string; href: string; current: boolean; locked?: boolean }[];
}) {
  return (
    <nav className="sp-subnav" aria-label="Cài đặt">
      {items.map((item) => (
        <Link
          key={item.id}
          href={item.href}
          aria-current={item.current ? 'page' : undefined}
          className={item.locked ? 'justify-between gap-2' : undefined}
        >
          {item.label}
          {item.locked && (
            <>
              <span className="sp-sr-only"> (cần nâng gói)</span>
              <LockIcon />
            </>
          )}
        </Link>
      ))}
    </nav>
  );
}
