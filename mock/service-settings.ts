/*
 * Dịch vụ (MH-44, MH-45) as pure functions: the limits of the form, names that may not repeat, the
 * groups and the order inside them, putting a service out of use and back, a new service from the
 * small form, the branches that lack a resource type a variant needs. Imports types and pure
 * modules only.
 */
import { cleanName, isActive, nameKey } from './branch-settings.ts';
import type { Branch, Resource, ResourceType, Service } from './fixtures/types.ts';

/** The heading of services that belong to no group (BR-94.7). */
export const OTHER_GROUP = 'Khác';

export const LIMITS = {
  serviceName: 80,
  groupName: 60,
  variantName: 40,
  shortName: 20,
  segmentLabel: 40,
  description: 500,
  variants: 10,
  segments: 8,
  /** Minutes the customer sees at most, from the first Làm to the last (BR-94.27). */
  visibleMinutes: 480,
  cleanupMinutes: 120,
  cleanupStep: 5,
} as const;

/** Prices are whole VND from 0 to 100.000.000 in steps of 1.000 (BR-94.19). */
export const PRICE_MAX = 100_000_000n;
export const PRICE_STEP = 1_000n;
export const PRICE_PROBLEM = 'Nhập giá từ 0 đến 100.000.000 ₫, bội của 1.000.';

export const priceProblem = (value: bigint | null): string | null =>
  value === null || value < 0n || value > PRICE_MAX || value % PRICE_STEP !== 0n
    ? PRICE_PROBLEM
    : null;

/** BR-94.22: minutes of a segment, 5 to 480 in steps of 5. */
export const MINUTES_PROBLEM = 'Nhập số phút từ 5 đến 480, bước 5.';
export const minutesProblem = (minutes: number): string | null =>
  Number.isInteger(minutes) && minutes >= 5 && minutes <= 480 && minutes % 5 === 0
    ? null
    : MINUTES_PROBLEM;

/** BR-94.28: minutes of cleaning, 0 (none) to 120 in steps of 5. */
export const CLEANUP_PROBLEM = 'Nhập số phút từ 0 đến 120, bước 5.';
export const cleanupProblem = (minutes: number): string | null =>
  Number.isInteger(minutes) &&
  minutes >= 0 &&
  minutes <= LIMITS.cleanupMinutes &&
  minutes % LIMITS.cleanupStep === 0
    ? null
    : CLEANUP_PROBLEM;

// ---- Groups (BR-94.3 to BR-94.7) ----

/** The group names in the order services first show them; where the store has none yet. */
export function deriveGroups(services: readonly Pick<Service, 'group'>[]): string[] {
  const names: string[] = [];
  for (const s of services) if (s.group !== '' && !names.includes(s.group)) names.push(s.group);
  return names;
}

/** BR-94.3, BR-94.7: why a group may not have this name, or `null`. */
export function groupNameProblem(
  groups: readonly string[],
  name: string,
  exceptName?: string,
): string | null {
  if (cleanName(name) === '') return 'Nhập tên nhóm.';
  if (nameKey(name) === nameKey(OTHER_GROUP)) return 'Đã có nhóm tên này.';
  const taken = groups.some((g) => g !== exceptName && nameKey(g) === nameKey(name));
  return taken ? 'Đã có nhóm tên này.' : null;
}

/** Services of a group, in use and out of use (`''` is "Khác"). */
export function groupCounts(services: readonly Service[], group: string) {
  const own = services.filter((s) => s.group === group);
  const archived = own.filter((s) => !isActive(s)).length;
  return { active: own.length - archived, archived };
}

/** BR-94.6: a group with services in use is not deleted. */
export const groupDeleteBlock = (services: readonly Service[], group: string): string | null =>
  groupCounts(services, group).active > 0 ? 'Còn dịch vụ đang dùng, không xóa được' : null;

/** BR-94.4: services follow the new name. */
export const renameGroup = (services: readonly Service[], from: string, to: string): Service[] =>
  services.map((s) => (s.group === from ? { ...s, group: to } : s));

/** BR-94.6: the services left in a deleted group (out of use) go to "Khác". */
export const removeGroup = (services: readonly Service[], group: string): Service[] =>
  services.map((s) => (s.group === group ? { ...s, group: '' } : s));

/** BR-94.5: the group next to `name` in direction `dir`, or `null`; `Lên` is -1. */
export function moveGroup(groups: readonly string[], name: string, dir: -1 | 1): string[] {
  const at = groups.indexOf(name);
  const to = at + dir;
  if (at < 0 || to < 0 || to >= groups.length) return [...groups];
  const next = [...groups];
  [next[at], next[to]] = [next[to]!, next[at]!];
  return next;
}

// ---- Services (BR-94.8 to BR-94.15) ----

/** BR-94.8: another service in use has the name. */
export const serviceNameTaken = (services: readonly Service[], name: string, exceptId?: string) =>
  services.some((s) => isActive(s) && s.id !== exceptId && nameKey(s.name) === nameKey(name));

/** BR-94.11: the service next to `id` among those in use in its group, in direction `dir`. */
export function serviceNeighbour(
  services: readonly Service[],
  id: string,
  dir: -1 | 1,
): Service | undefined {
  const service = services.find((s) => s.id === id);
  if (!service) return undefined;
  const group = services.filter((s) => s.group === service.group && isActive(s));
  return group[group.findIndex((s) => s.id === id) + dir];
}

/** BR-94.11: swaps the service with its neighbour; the list order is the order. */
export function moveService(services: readonly Service[], id: string, dir: -1 | 1): Service[] {
  const service = services.find((s) => s.id === id);
  const other = serviceNeighbour(services, id, dir);
  if (!service || !other) return [...services];
  return services.map((s) => (s.id === id ? other : s.id === other.id ? service : s));
}

/** The service goes last of the list, so last of its group: a new, restored or regrouped one. */
export const toEnd = (services: readonly Service[], service: Service): Service[] => [
  ...services.filter((s) => s.id !== service.id),
  service,
];

/** BR-94.12: out of use; nothing else changes. */
export const archiveService = (services: readonly Service[], id: string, now: string): Service[] =>
  services.map((s) => (s.id === id ? { ...s, archivedAt: now } : s));

/** BR-94.13: in use again, last of its group. */
export function restoreService(services: readonly Service[], id: string): Service[] {
  const service = services.find((s) => s.id === id);
  if (!service) return [...services];
  const { archivedAt: _out, ...rest } = service;
  return toEnd(services, rest);
}

/** Saves one service; one that changed group stands last in the new one (BR-94.11). */
export function replaceService(services: readonly Service[], service: Service): Service[] {
  const old = services.find((s) => s.id === service.id);
  if (old && old.group !== service.group) return toEnd(services, service);
  return services.map((s) => (s.id === service.id ? service : s));
}

export interface NewServiceInput {
  name: string;
  group: string;
  variantName: string;
  priceVnd: bigint;
  minutes: number;
}

export function newServiceId(services: readonly Pick<Service, 'id'>[], tenantId: string): string {
  let n = services.length + 1;
  while (services.some((s) => s.id === `${tenantId}-sv-${n}`)) n++;
  return `${tenantId}-sv-${n}`;
}

/** BR-94.9: the service the small form makes: one variant, one Làm segment for the staff, not online yet. */
export function buildService(
  input: NewServiceInput,
  id: string,
  tenantId: string,
  staffTypeId: string,
): Service {
  const variantName = cleanName(input.variantName);
  return {
    id,
    tenantId,
    name: cleanName(input.name),
    group: input.group,
    bookableOnline: false,
    variants: [
      {
        id: `${id}-v1`,
        name: variantName,
        shortName: cleanName(input.name).slice(0, LIMITS.shortName).trim(),
        priceVnd: input.priceVnd,
        segments: [
          {
            startMinute: 0,
            endMinute: input.minutes,
            kind: 'work',
            name: 'Làm',
            resourceTypeIds: [staffTypeId],
          },
        ],
        cleanupMinutes: {},
      },
    ],
  };
}

// ---- Branches without a resource type (BR-94.30) ----

export interface MissingResource {
  branchId: string;
  branchName: string;
  variantId: string;
  variantName: string;
  /** Names of the resource types the branch has no resource in use of, in the order of the types. */
  typeNames: string[];
}

/**
 * The branches in use that have no resource in use of a type a segment of a variant holds: the
 * variant cannot be booked there. Saving is still allowed.
 */
export function missingResources(
  variants: readonly {
    id: string;
    name: string;
    segments: readonly { resourceTypeIds: readonly string[] }[];
  }[],
  branches: readonly Branch[],
  resources: readonly Resource[],
  types: readonly ResourceType[],
): MissingResource[] {
  const out: MissingResource[] = [];
  for (const branch of branches.filter(isActive)) {
    const have = new Set(
      resources.filter((r) => r.branchId === branch.id && isActive(r)).map((r) => r.resourceTypeId),
    );
    for (const variant of variants) {
      const needed = new Set(variant.segments.flatMap((s) => s.resourceTypeIds));
      const typeNames = types.filter((t) => needed.has(t.id) && !have.has(t.id)).map((t) => t.name);
      if (typeNames.length > 0) {
        out.push({
          branchId: branch.id,
          branchName: branch.name,
          variantId: variant.id,
          variantName: variant.name,
          typeNames,
        });
      }
    }
  }
  return out;
}

/** `Chi nhánh X không có Y, biến thể Z không đặt được ở đó.` */
export const missingText = (m: MissingResource) =>
  `Chi nhánh ${m.branchName} không có ${m.typeNames.join(', ')}, biến thể ${m.variantName} không đặt được ở đó.`;
