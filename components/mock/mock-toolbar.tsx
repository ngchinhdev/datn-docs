'use client';

import { useTheme } from 'fumadocs-ui/provider/base';
import { ChevronDown, Monitor, Moon, Sun } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { tenantFixtures } from '@/mock/fixtures';
import { PLAN_OVERRIDES, planOverrideOf } from '@/mock/subscription';
import {
  fixtureBySlug,
  roleLabel,
  roles,
  staffRoleOf,
  type Role,
  type StaffRole,
} from '@/mock/selection';

/** Where a mock URL points: the tenant slug and which area it is in. */
function locate(pathname: string): { area: 'book' | 'app' | 'index'; slug: string | null } {
  const [, , first, second] = pathname.split('/');
  if (first === 'app' && second) return { area: 'app', slug: second };
  if (first && second === 'book') return { area: 'book', slug: first };
  return { area: 'index', slug: null };
}

/** First page of each role in `/mock/app/[tenant]`; the owner has no overview screen yet. */
const staffHome: Record<StaffRole, string> = {
  receptionist: 'calendar',
  technician: 'my/schedule',
  manager: 'calendar',
  owner: 'calendar',
};

export function MockToolbar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { area, slug } = locate(pathname);
  const fixture = fixtureBySlug(slug ?? undefined);
  const role: Role | null =
    area === 'book' ? 'customer' : area === 'app' ? staffRoleOf(searchParams.get('role')) : null;
  const [open, setOpen] = useState(false);
  const isBooking = area === 'book';
  const newCustomer = searchParams.get('khach') === 'moi';

  const tenantHref = (target: string) => {
    const query = searchParams.toString();
    const path = pathname.replace(`/${slug}/`, `/${target}/`);
    return query ? `${path}?${query}` : path;
  };
  const khachHref = (value: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('khach', value);
    return `${pathname}?${params}`;
  };
  /** The plan being tried goes along when the role changes. */
  const carried = () => {
    const params = new URLSearchParams();
    for (const key of ['plan', 'periodEnd', 'branches']) {
      const value = searchParams.get(key);
      if (value) params.set(key, value);
    }
    return params;
  };
  const roleHref = (r: Role) => {
    if (!slug) return pathname;
    const params = carried();
    if (r !== 'customer' && r !== 'owner') params.set('role', r);
    const query = params.toString();
    const path = r === 'customer' ? `/mock/${slug}/book` : `/mock/app/${slug}/${staffHome[r]}`;
    return query ? `${path}?${query}` : path;
  };
  const planValue = planOverrideOf(searchParams.get('plan')) ?? 'default';
  const planHref = (value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value === 'default') params.delete('plan');
    else params.set('plan', value);
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  };

  const pickers = fixture && role && (
    <>
      <Picker
        label="Cơ sở"
        options={tenantFixtures.map((f) => ({ value: f.tenant.slug, label: f.tenant.name }))}
        selected={fixture.tenant.slug}
        hrefFor={tenantHref}
      />
      <Picker
        label="Vai trò"
        options={roles.map((r) => ({ value: r.id, label: r.label }))}
        selected={role}
        hrefFor={(value) => roleHref(value as Role)}
      />
      <Picker
        label="Gói"
        options={[{ value: 'default', label: 'Mặc định' }, ...PLAN_OVERRIDES]}
        selected={planValue}
        hrefFor={planHref}
      />
      {isBooking && (
        <Picker
          label="Khách"
          options={[
            { value: 'cu', label: 'Khách cũ' },
            { value: 'moi', label: 'Khách mới' },
          ]}
          selected={newCustomer ? 'moi' : 'cu'}
          hrefFor={khachHref}
        />
      )}
    </>
  );

  return (
    <div className="flex min-w-0 grow flex-wrap items-center gap-x-6 gap-y-2">
      {pickers && (
        <>
          {/* Phone: one line, the pickers open below on demand. */}
          <button
            type="button"
            aria-expanded={open}
            aria-controls="mock-pickers"
            onClick={() => setOpen((v) => !v)}
            className="flex min-w-0 items-center gap-1 text-sm md:hidden"
          >
            <span className="truncate">
              {fixture?.tenant.name} · {role && roleLabel(role)}
              {isBooking && ` · ${newCustomer ? 'Khách mới' : 'Khách cũ'}`}
            </span>
            <ChevronDown
              size={16}
              aria-hidden="true"
              className={cn('flex-none transition-transform', open && 'rotate-180')}
            />
            <span className="sr-only">Đổi lựa chọn</span>
          </button>
          <div
            id="mock-pickers"
            className={cn(
              'w-full flex-col gap-2 md:flex md:w-auto md:flex-row md:flex-wrap md:items-center md:gap-x-6',
              open ? 'flex' : 'hidden',
            )}
          >
            {pickers}
          </div>
        </>
      )}
      <ThemeSwitch />
    </div>
  );
}

const THEMES = [
  { value: 'light', label: 'Sáng', icon: Sun },
  { value: 'dark', label: 'Tối', icon: Moon },
  { value: 'system', label: 'Theo máy', icon: Monitor },
] as const;

/** Same provider as `/docs`, so switching here switches both. */
function ThemeSwitch() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div role="group" aria-label="Giao diện" className="ms-auto flex items-center gap-0.5">
      {THEMES.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          aria-pressed={mounted ? theme === value : undefined}
          aria-label={label}
          title={label}
          onClick={() => setTheme(value)}
          className={buttonVariants({
            variant: mounted && theme === value ? 'secondary' : 'ghost',
            size: 'icon-sm',
          })}
        >
          <Icon size={16} aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}

interface PickerProps {
  label: string;
  options: { value: string; label: string }[];
  selected: string;
  hrefFor: (value: string) => string;
}

function Picker({ label, options, selected, hrefFor }: PickerProps) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap items-center gap-1">
      <span className="me-1 text-sm text-muted-foreground">{label}:</span>
      {options.map((option) => {
        const isSelected = option.value === selected;
        return (
          <Link
            key={option.value}
            href={hrefFor(option.value)}
            scroll={false}
            aria-current={isSelected ? 'true' : undefined}
            className={buttonVariants({ variant: isSelected ? 'default' : 'outline', size: 'sm' })}
          >
            {option.label}
          </Link>
        );
      })}
    </div>
  );
}
