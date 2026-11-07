import { tenantFixtures, type TenantFixture } from './fixtures';

export const roles = [
  { id: 'customer', label: 'Khách' },
  { id: 'receptionist', label: 'Lễ tân' },
  { id: 'technician', label: 'Kỹ thuật viên' },
  { id: 'manager', label: 'Quản lý chi nhánh' },
  { id: 'owner', label: 'Chủ cơ sở' },
] as const;

export type Role = (typeof roles)[number]['id'];

/** Roles that work in `/mock/app`; the customer only has the booking page. */
export type StaffRole = Exclude<Role, 'customer'>;

export const roleLabel = (id: Role) => roles.find((r) => r.id === id)?.label ?? id;

/** The tenant behind a URL slug, or `undefined` for an unknown one (the route answers 404). */
export function fixtureBySlug(slug: string | undefined): TenantFixture | undefined {
  return tenantFixtures.find((f) => f.tenant.slug === slug);
}

/** Role of `/mock/app` from `?role=`; unknown or missing values mean the owner. */
export function staffRoleOf(value: string | null | undefined): StaffRole {
  const found = roles.find((r) => r.id === value);
  return found && found.id !== 'customer' ? found.id : 'owner';
}
