/*
 * Pure functions over one service variant: what it occupies, what the customer sees, what it
 * costs. Sample for `packages/scheduling-core`.
 */
import { length, normalize, type Interval } from './intervals.ts';
import type { ServiceSegment, ServiceVariant } from './fixtures/types.ts';

/** Value of the staff choice that lets the system assign the person (BR-14). */
export const ANY_STAFF = 'any';

/** Resource types a variant uses, in order of first use. */
export function resourceTypesOf(variant: Pick<ServiceVariant, 'segments'>): string[] {
  return [...new Set(variant.segments.flatMap((s) => s.resourceTypeIds))];
}

const originOf = (segments: readonly ServiceSegment[]) =>
  segments.length ? Math.min(...segments.map((s) => s.startMinute)) : 0;

/**
 * BR-51: the part the customer sees runs from the start of the first `work` segment to the end
 * of the last one, `wait` in between included. Minutes from the start of the first segment.
 */
export function visibleRange(variant: Pick<ServiceVariant, 'segments'>): Interval {
  const { segments } = variant;
  const work = segments.filter((s) => s.kind === 'work');
  const base = work.length ? work : segments;
  if (!base.length) return [0, 0];
  return [Math.min(...base.map((s) => s.startMinute)), Math.max(...base.map((s) => s.endMinute))];
}

/** Minutes the customer is in the shop, for the "1 giờ 45" shown to them. */
export const visibleMinutes = (variant: Pick<ServiceVariant, 'segments'>) => {
  const [from, to] = visibleRange(variant);
  return to - from;
};

/** Minutes of `prep` before the customer's time (BR-51). */
export const prepMinutes = (variant: Pick<ServiceVariant, 'segments'>) =>
  visibleRange(variant)[0] - originOf(variant.segments);

/**
 * BR-04, BR-52: when resource type `typeId` is held, relative to the start of the first segment:
 * its segments plus the cleanup that starts when the last of them ends.
 */
export function occupation(
  variant: Pick<ServiceVariant, 'segments' | 'cleanupMinutes'>,
  typeId: string,
): Interval[] {
  const mine = variant.segments.filter((s) => s.resourceTypeIds.includes(typeId));
  if (!mine.length) return [];
  const parts: Interval[] = mine.map((s) => [s.startMinute, s.endMinute]);
  const cleanup = variant.cleanupMinutes[typeId] ?? 0;
  if (cleanup > 0) {
    const lastEnd = Math.max(...mine.map((s) => s.endMinute));
    parts.push([lastEnd, lastEnd + cleanup]);
  }
  return normalize(parts);
}

export interface TypeLoad {
  typeId: string;
  /** Minutes held, cleanup included. */
  busy: number;
  /** Minutes inside the first-to-last segment during which the type is free. */
  gap: number;
  cleanup: number;
}

/** For the "Tóm tắt" panel: how long each resource type is held. */
export function busyMinutes(
  variant: Pick<ServiceVariant, 'segments' | 'cleanupMinutes'>,
): TypeLoad[] {
  return resourceTypesOf(variant).map((typeId) => {
    const mine = variant.segments.filter((s) => s.resourceTypeIds.includes(typeId));
    const used = length(normalize(mine.map((s): Interval => [s.startMinute, s.endMinute])));
    const span =
      Math.max(...mine.map((s) => s.endMinute)) - Math.min(...mine.map((s) => s.startMinute));
    return {
      typeId,
      busy: length(occupation(variant, typeId)),
      gap: span - used,
      cleanup: variant.cleanupMinutes[typeId] ?? 0,
    };
  });
}

export interface PricedStaff {
  resourceId: string;
  /** 1-based, as `Staff.level`. */
  level: number;
}

/**
 * BR-56: a chosen person charges the price of their level; `ANY_STAFF` charges the lowest price
 * among `staff` (the people who can do the service). Without prices per level, `priceVnd`.
 */
export function priceFor(
  variant: Pick<ServiceVariant, 'priceVnd' | 'pricesByLevel'>,
  who: string,
  staff: readonly PricedStaff[],
): bigint {
  const prices = variant.pricesByLevel;
  if (!prices || prices.length === 0) return variant.priceVnd;
  const atLevel = (level: number) =>
    prices[Math.min(Math.max(level, 1), prices.length) - 1] ?? variant.priceVnd;
  if (who !== ANY_STAFF) {
    const person = staff.find((s) => s.resourceId === who);
    return person ? atLevel(person.level) : variant.priceVnd;
  }
  if (staff.length === 0) return variant.priceVnd;
  return staff.map((s) => atLevel(s.level)).reduce((low, p) => (p < low ? p : low));
}

/** Lowest and highest price a customer can pay for the variant among `staff`. */
export function priceRange(
  variant: Pick<ServiceVariant, 'priceVnd' | 'pricesByLevel'>,
  staff: readonly PricedStaff[],
): [bigint, bigint] {
  const prices = staff.map((s) => priceFor(variant, s.resourceId, staff));
  if (prices.length === 0) return [variant.priceVnd, variant.priceVnd];
  return [prices.reduce((a, b) => (b < a ? b : a)), prices.reduce((a, b) => (b > a ? b : a))];
}
