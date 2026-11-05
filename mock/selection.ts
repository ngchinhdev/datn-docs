import { tenantFixtures, type TenantFixture } from './fixtures';

export const roles = [
  { id: 'customer', label: 'Khách' },
  { id: 'receptionist', label: 'Lễ tân' },
  { id: 'owner', label: 'Chủ cơ sở' },
] as const;

export type Role = (typeof roles)[number]['id'];

export interface MockSelection {
  fixture: TenantFixture;
  role: Role;
}

type Param = string | string[] | null | undefined;

const first = (value: Param) => (Array.isArray(value) ? value[0] : value);

/** Reads `?tenant=<slug>&role=<id>`; unknown or missing values fall back to the first option. */
export function parseSelection(tenant: Param, role: Param): MockSelection {
  const tenantSlug = first(tenant);
  const roleId = first(role);
  const defaultFixture = tenantFixtures[0];
  if (!defaultFixture) throw new Error('mock/fixtures has no tenant');

  return {
    fixture: tenantFixtures.find((f) => f.tenant.slug === tenantSlug) ?? defaultFixture,
    role: roles.find((r) => r.id === roleId)?.id ?? 'customer',
  };
}
