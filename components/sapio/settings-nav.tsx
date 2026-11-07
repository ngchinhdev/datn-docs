import Link from 'next/link';

/** The menu of the settings pages; hidden below 900px, where `/settings` lists the sections. */
export function SettingsNav({
  items,
}: {
  items: { id: string; label: string; href: string; current: boolean }[];
}) {
  return (
    <nav className="sp-subnav" aria-label="Cài đặt">
      {items.map((item) => (
        <Link key={item.id} href={item.href} aria-current={item.current ? 'page' : undefined}>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
