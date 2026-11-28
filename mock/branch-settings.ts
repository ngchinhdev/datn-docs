/*
 * Chi nhánh và tài nguyên (MH-42, MH-43, MH-46) as pure functions: the branch limit of the plan,
 * names that may not repeat, the state of a resource, the order inside a group, whether a type can
 * go. Imports types and pure modules only.
 */
import type {
  Branch,
  BusinessHours,
  Resource,
  ResourceOutage,
  ResourceType,
  Service,
} from './fixtures/types.ts';
import { activeOutage } from './outage.ts';
import { isContactPhone } from './signup';

/** Windows a day may have (BR-93.11). */
export const MAX_WINDOWS = 4;

/** Hours a new branch starts with: Monday to Saturday 08:00 to 20:00, Sunday off (BR-93.7). */
export const DEFAULT_HOURS: BusinessHours[] = ([1, 2, 3, 4, 5, 6] as const).map((weekday) => ({
  weekday,
  open: '08:00',
  close: '20:00',
}));

/** Spaces trimmed and squeezed: how a name is stored (BR-93.4). */
export const cleanName = (name: string) => name.trim().replace(/\s+/g, ' ');

/** How two names are compared: without case and extra spaces (BR-93.4, BR-93.17, BR-93.21). */
export const nameKey = (name: string) => cleanName(name).toLowerCase();

export const isActive = (item: { archivedAt?: string }) => !item.archivedAt;

/** BR-93.2: the plan allows `max` active branches; `null` is no limit. */
export const atBranchLimit = (activeBranches: number, max: number | null) =>
  max !== null && activeBranches >= max;

/** BR-93.4: another branch in use has the name. */
export const branchNameTaken = (branches: readonly Branch[], name: string, exceptId?: string) =>
  branches.some((b) => isActive(b) && b.id !== exceptId && nameKey(b.name) === nameKey(name));

/** BR-93.5: a Vietnamese number, mobile or landline. */
export const phoneProblem = (phone: string): string | null =>
  isContactPhone(phone) ? null : 'Số điện thoại chưa đúng. Ví dụ: 028 3930 1234.';

/** BR-93.21: another resource in use in the branch has the name. */
export const resourceNameTaken = (
  resources: readonly Resource[],
  branchId: string,
  name: string,
  exceptId?: string,
) =>
  resources.some(
    (r) =>
      isActive(r) &&
      r.branchId === branchId &&
      r.id !== exceptId &&
      nameKey(r.name) === nameKey(name),
  );

/** BR-93.17: no type has the name. */
export const typeNameTaken = (types: readonly ResourceType[], name: string, exceptId?: string) =>
  types.some((t) => t.id !== exceptId && nameKey(t.name) === nameKey(name));

export type ResourceState = 'active' | 'paused' | 'archived';

/** A resource of a branch that is out of use counts as out of use itself (BR-93.9). */
export function resourceState(
  resource: Resource,
  branches: readonly Branch[],
  outages: readonly ResourceOutage[],
  now: string,
): ResourceState {
  const branch = branches.find((b) => b.id === resource.branchId);
  if (resource.archivedAt || branch?.archivedAt) return 'archived';
  return activeOutage(outages, resource.id, now) ? 'paused' : 'active';
}

/** The end of a resource that is out of use for good: far enough that nothing is ever booked. */
export const FOREVER = '2099-12-31T16:59:00Z';

const sameGroup = (a: Resource, b: Resource) =>
  a.branchId === b.branchId && a.resourceTypeId === b.resourceTypeId;

/** BR-93.23: the resource next to `id` in its group (branch, type) in direction `dir`, if any. */
export function neighbour(
  resources: readonly Resource[],
  id: string,
  dir: -1 | 1,
): Resource | undefined {
  const resource = resources.find((r) => r.id === id);
  if (!resource) return undefined;
  const group = resources.filter((r) => sameGroup(r, resource) && isActive(r));
  return group[group.findIndex((r) => r.id === id) + dir];
}

/** BR-93.23: swaps the resource with its neighbour in the group; the list order is the order. */
export function moveResource(resources: readonly Resource[], id: string, dir: -1 | 1): Resource[] {
  const resource = resources.find((r) => r.id === id);
  const other = neighbour(resources, id, dir);
  if (!resource || !other) return [...resources];
  return resources.map((r) => (r.id === id ? other : r.id === other.id ? resource : r));
}

/** BR-93.16, BR-93.19: why a type cannot be deleted, or `null`. */
export function typeDeleteBlock(
  type: ResourceType,
  resources: readonly Resource[],
  services: readonly Service[],
): string | null {
  if (type.isStaff) return 'Loại có sẵn, không xóa được.';
  const count = resources.filter((r) => r.resourceTypeId === type.id).length;
  if (count > 0) {
    return `Còn ${count} tài nguyên thuộc loại này, kể cả đã ngừng dùng, nên không xóa được.`;
  }
  const used = services.find((s) =>
    s.variants.some(
      (v) =>
        v.segments.some((seg) => seg.resourceTypeIds.includes(type.id)) ||
        (v.cleanupMinutes[type.id] ?? 0) > 0,
    ),
  );
  return used ? `Dịch vụ ${used.name} đang dùng loại này.` : null;
}
