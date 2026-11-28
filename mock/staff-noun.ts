import type { TenantFixture } from './fixtures/types.ts';

/** What the tenant calls its people, from the name of its staff resource type: "Thợ", "Kỹ thuật viên". */
export const staffNounOf = (fixture: Pick<TenantFixture, 'resourceTypes'>): string =>
  fixture.resourceTypes.find((t) => t.isStaff)?.name ?? 'Nhân viên';
