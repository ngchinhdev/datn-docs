'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { buttonVariants } from '@/components/ui/button';
import { tenantFixtures } from '@/mock/fixtures';
import { parseSelection, roles } from '@/mock/selection';

export function MockToolbar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { fixture, role } = parseSelection(searchParams.get('tenant'), searchParams.get('role'));

  const hrefWith = (key: 'tenant' | 'role' | 'khach', value: string) => {
    const params = new URLSearchParams(searchParams);
    params.set(key, value);
    return `${pathname}?${params}`;
  };

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
      <Picker
        label="Cơ sở"
        options={tenantFixtures.map((f) => ({ value: f.tenant.slug, label: f.tenant.name }))}
        selected={fixture.tenant.slug}
        hrefFor={(value) => hrefWith('tenant', value)}
      />
      <Picker
        label="Vai trò"
        options={roles.map((r) => ({ value: r.id, label: r.label }))}
        selected={role}
        hrefFor={(value) => hrefWith('role', value)}
      />
      <Picker
        label="Khách"
        options={[
          { value: 'cu', label: 'Khách cũ' },
          { value: 'moi', label: 'Khách mới' },
        ]}
        selected={searchParams.get('khach') === 'moi' ? 'moi' : 'cu'}
        hrefFor={(value) => hrefWith('khach', value)}
      />
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
    <div role="group" aria-label={label} className="flex items-center gap-1">
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
