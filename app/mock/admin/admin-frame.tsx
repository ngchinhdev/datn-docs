'use client';

import { Building2, LayoutDashboard, ScrollText, Tag, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { useAccountStore } from '@/components/mock/account-store';
import { AppShell, type ShellNavItem } from '@/components/sapio/app-shell';
import { useToast } from '@/components/sapio/toast';
import { tenantFixtures } from '@/mock/fixtures';
import { initialsOfName } from '@/mock/people-format';

interface AdminEntry {
  id: string;
  label: string;
  path: string;
  icon: LucideIcon;
}

/** The menu of the platform administration (MH-59, MH-60, MH-62); the pages not built open "Chưa làm". */
const ENTRIES: AdminEntry[] = [
  { id: 'overview', label: 'Tổng quan', path: '/mock/admin', icon: LayoutDashboard },
  { id: 'tenants', label: 'Khách thuê', path: '/mock/admin/tenants', icon: Building2 },
  { id: 'plans', label: 'Gói và giá', path: '/mock/admin/plans', icon: Tag },
  { id: 'audit-log', label: 'Nhật ký', path: '/mock/admin/audit-log', icon: ScrollText },
];

export function AdminFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const toast = useToast();
  const router = useRouter();
  const { adminAccount, patch, hydrated } = useAccountStore();
  const person = adminAccount?.fullName ?? 'Quản trị Sapio';
  const onLogin = pathname === '/mock/admin/login';

  // No administrator session (T-18): every page of the area but the sign-in page sends you there.
  useEffect(() => {
    if (hydrated && !adminAccount && !onLogin) router.replace('/mock/admin/login');
  }, [hydrated, adminAccount, onLogin, router]);
  const isCurrent = (path: string) =>
    path === '/mock/admin'
      ? pathname === path
      : pathname === path || pathname.startsWith(`${path}/`);

  const items: ShellNavItem[] = ENTRIES.map((entry) => ({
    id: entry.id,
    label: entry.label,
    href: entry.path,
    icon: entry.icon,
    group: 'Vận hành',
    current: isCurrent(entry.path),
  }));
  const tabs = items.slice(0, 3);

  if (onLogin) return <>{children}</>;
  if (!adminAccount) return null;

  return (
    <AppShell
      workspace={{ name: 'Sapio', initial: 'S', accentClass: '' }}
      platform={{ name: 'Quản trị nền tảng', sub: 'admin.sapio.vn', initial: 'S' }}
      branchName=""
      branches={[]}
      otherWorkspaces={[]}
      newWorkspaceHref="/mock/signup"
      items={items}
      tabs={tabs}
      account={{ name: person, initials: initialsOfName(person), roleLabel: 'Quản trị nền tảng' }}
      onProfile={() => toast({ text: 'Hồ sơ cá nhân: chưa có trong mock.' })}
      onSignOut={() => {
        patch(() => ({ adminSession: null }));
        router.push('/mock/admin/login');
      }}
      accountExtra={(kind) => (
        <>
          <div className={kind === 'menu' ? 'sp-menu__label' : 'sp-menu__label mt-(--space-2)'}>
            Xem mock với vai trò
          </div>
          <Link
            href="/mock/admin"
            className="sp-menu__item"
            {...(kind === 'menu'
              ? { role: 'menuitemradio', 'aria-checked': true }
              : { 'aria-current': 'true' as const })}
          >
            Quản trị nền tảng
          </Link>
          {tenantFixtures.map((f) => (
            <Link
              key={f.tenant.slug}
              href={`/mock/app/${f.tenant.slug}/calendar`}
              className="sp-menu__item"
              {...(kind === 'menu' ? { role: 'menuitem' } : {})}
            >
              Chủ cơ sở · {f.tenant.name}
            </Link>
          ))}
          <Link
            href="/mock/screens"
            className="sp-menu__item"
            {...(kind === 'menu' ? { role: 'menuitem' } : {})}
          >
            Danh sách màn hình mock
          </Link>
        </>
      )}
    >
      {children}
    </AppShell>
  );
}
