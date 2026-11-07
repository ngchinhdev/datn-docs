'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import type { ReactNode } from 'react';
import { navByRole, tabIds } from '@/components/mock/app-nav';
import { useStaffStore } from '@/components/mock/staff-store';
import { useAppHref } from '@/components/mock/use-app-href';
import { AppShell, type ShellNavItem } from '@/components/sapio/app-shell';
import { useToast } from '@/components/sapio/toast';
import { cn } from '@/lib/utils';
import { tenantFixtures } from '@/mock/fixtures';
import { fixtureBySlug, roleLabel, staffRoleOf, type StaffRole } from '@/mock/selection';

/** Roles the mock lets you try; the sidebar and the allowed pages follow the role. */
const STAFF_ROLES: StaffRole[] = ['receptionist', 'technician', 'manager', 'owner'];

/** Person shown in the account row for each role. */
const PEOPLE: Record<Exclude<StaffRole, 'technician'>, string> = {
  owner: 'Chính Nguyễn',
  manager: 'Thu Hương',
  receptionist: 'Minh Anh',
};

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .slice(-2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

/** The role another tenant shows in the switcher; the mock account has a fixed one there. */
const OTHER_TENANT_ROLE: StaffRole = 'receptionist';

export function AppFrame({ tenantSlug, children }: { tenantSlug: string; children: ReactNode }) {
  const fixture = fixtureBySlug(tenantSlug) ?? tenantFixtures[0]!;
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const appHref = useAppHref(tenantSlug);
  const toast = useToast();
  const { staff } = useStaffStore();
  const role = staffRoleOf(searchParams.get('role'));
  const branch =
    fixture.branches.find((b) => b.id === searchParams.get('branch')) ?? fixture.branches[0]!;
  const base = `/mock/app/${tenantSlug}`;

  const isCurrent = (path: string) =>
    path === ''
      ? pathname === base
      : pathname === `${base}/${path}` || pathname.startsWith(`${base}/${path}/`);

  const items: ShellNavItem[] = navByRole[role].map((entry) => ({
    id: entry.id,
    label: entry.label,
    href: appHref(entry.path),
    icon: entry.icon,
    ...(entry.group ? { group: entry.group } : {}),
    ...(entry.badge ? { badge: entry.badge } : {}),
    current: isCurrent(entry.path),
  }));
  const wanted = tabIds(role);
  const tabs = wanted
    .map((id) => items.find((i) => i.id === id))
    .filter((i): i is ShellNavItem => Boolean(i))
    .map((item) => {
      const tabLabel = navByRole[role].find((e) => e.id === item.id)?.tabLabel;
      return tabLabel ? { ...item, label: tabLabel } : item;
    });

  const person =
    role === 'technician' ? (staff[0]?.profile.displayName ?? 'Kỹ thuật viên') : PEOPLE[role];

  const withQuery = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    params.set(key, value);
    return `${pathname}?${params}`;
  };

  const accentOf = (slug: string) => `sp-tenant-${fixtureBySlug(slug)?.tenant.id ?? 'may'}`;
  return (
    <AppShell
      workspace={{
        name: fixture.tenant.name,
        initial: fixture.tenant.monogram,
        accentClass: accentOf(tenantSlug),
      }}
      branchName={branch.name}
      branches={fixture.branches.map((b) => ({
        id: b.id,
        name: b.name,
        address: b.address,
        current: b.id === branch.id,
        href: withQuery('branch', b.id),
      }))}
      otherWorkspaces={tenantFixtures
        .filter((f) => f.tenant.slug !== tenantSlug)
        .map((f) => ({
          name: f.tenant.name,
          initial: f.tenant.monogram,
          accentClass: accentOf(f.tenant.slug),
          sub: `Vai trò: ${roleLabel(OTHER_TENANT_ROLE)}`,
          href: `/mock/app/${f.tenant.slug}/calendar?role=${OTHER_TENANT_ROLE}`,
        }))}
      newWorkspaceHref="/mock/signup"
      items={items}
      tabs={tabs}
      account={{ name: person, initials: initialsOf(person), roleLabel: roleLabel(role) }}
      onProfile={() => toast({ text: 'Hồ sơ cá nhân: chưa có trong mock.' })}
      onSignOut={() => toast({ text: 'Đăng xuất: chưa có trong mock.' })}
      accountExtra={(kind) => (
        <>
          <div className={kind === 'menu' ? 'sp-menu__label' : 'sp-menu__label mt-(--space-2)'}>
            Xem mock với vai trò
          </div>
          {STAFF_ROLES.map((r) => (
            <Link
              key={r}
              href={withQuery('role', r)}
              scroll={false}
              className={cn('sp-menu__item', kind === 'list' && 'min-h-11')}
              {...(kind === 'menu'
                ? { role: 'menuitemradio', 'aria-checked': r === role }
                : { 'aria-current': r === role ? ('true' as const) : undefined })}
            >
              {roleLabel(r)}
            </Link>
          ))}
          <Link
            href="/mock"
            className={cn('sp-menu__item', kind === 'list' && 'min-h-11')}
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
