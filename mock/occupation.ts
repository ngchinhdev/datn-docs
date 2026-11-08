/*
 * Pure functions over one service variant: what it occupies, what the customer sees, what it
 * costs, whether its conditions cover every subject. Sample for `packages/scheduling-core`.
 * Imports only types, so Node can run it directly (scripts/check-availability.ts).
 */
import { length, normalize, type Interval } from './intervals.ts';
import { isRequired } from './subject-schema.ts';
import type {
  MatchValue,
  Service,
  ServiceSegment,
  ServiceVariant,
  SubjectField,
} from './fixtures/types.ts';

/** Value of the staff choice that lets the system assign the person (BR-14). */
export const ANY_STAFF = 'any';

/** BR-13: does a served subject's attributes select a variant? Ranges compare as numbers. */
export function matchesAttributes(
  match: Record<string, MatchValue>,
  attributes: Record<string, string>,
): boolean {
  return Object.entries(match).every(([key, wanted]) => {
    const actual = attributes[key];
    if (typeof wanted === 'string') return actual === wanted;
    const n = Number(actual);
    if (actual === undefined || Number.isNaN(n)) return false;
    return (
      (wanted.min === undefined || n >= wanted.min) && (wanted.max === undefined || n < wanted.max)
    );
  });
}

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

const ABSENT = Symbol('absent');
type Choice = string | typeof ABSENT;

const numberText = (n: number) => String(Number(n.toFixed(2))).replace('.', ',');

interface Combo {
  values: Record<string, Choice>;
  /** Representative number per number field, and where its run of equal results ends. */
  ends: Record<string, number>;
}

/**
 * BR-55: with variants chosen by the subject's attributes, every valid subject must match exactly
 * one variant. Tries each option of a choice field and, for a number field, one value in every
 * stretch between the limits the variants use. Returns readable errors; empty when the
 * conditions are sound.
 */
export function checkVariantCoverage(
  service: Pick<Service, 'variantSelection' | 'variants'>,
  schema: readonly SubjectField[],
): string[] {
  if (service.variantSelection === 'customer') return [];
  if (service.variants.length === 0) return ['Chưa có biến thể nào.'];

  const fields = schema.filter((f) => f.type !== 'text');
  const limits = (key: string) => {
    const set = new Set<number>([0]);
    for (const v of service.variants) {
      const m = v.match[key];
      if (m && typeof m !== 'string') {
        for (const n of [m.min, m.max]) if (n !== undefined && n > 0) set.add(n);
      }
    }
    return [...set].sort((a, b) => a - b);
  };

  const combos: Combo[] = [];
  const walk = (i: number, values: Record<string, Choice>, ends: Record<string, number>) => {
    const field = fields[i];
    if (!field) {
      combos.push({ values: { ...values }, ends: { ...ends } });
      return;
    }
    const known = Object.fromEntries(
      Object.entries(values).flatMap(([k, v]) => (v === ABSENT ? [] : [[k, v]])),
    );
    if (field.type === 'enum') {
      const options: Choice[] = field.options.map((o) => o.value);
      if (field.required !== true) options.push(ABSENT);
      for (const option of options) walk(i + 1, { ...values, [field.key]: option }, ends);
      return;
    }
    const starts = limits(field.key);
    const choices: { value: Choice; end: number }[] = starts.map((start, j) => ({
      value: String(start),
      end: starts[j + 1] ?? Infinity,
    }));
    if (!isRequired(field, known)) choices.unshift({ value: ABSENT, end: 0 });
    for (const { value, end } of choices) {
      walk(i + 1, { ...values, [field.key]: value }, { ...ends, [field.key]: end });
    }
  };
  walk(0, {}, {});

  const numberFields = fields.filter((f) => f.type === 'number');
  const phrase = (combo: Combo, merged: Map<Combo, number>) => {
    const parts: string[] = [];
    for (const field of fields) {
      const value = combo.values[field.key];
      if (value === undefined || value === ABSENT) continue;
      if (field.type === 'enum') {
        parts.push(field.options.find((o) => o.value === value)?.label ?? value);
      } else if (field.type === 'number') {
        const unit = field.unit ? ` ${field.unit}` : '';
        const from = Number(value);
        const to = merged.get(combo) ?? combo.ends[field.key] ?? Infinity;
        if (merged.has(combo)) {
          if (from > 0 && to === Infinity) parts.push(`từ ${numberText(from)}${unit}`);
          else if (from > 0) parts.push(`từ ${numberText(from)} đến dưới ${numberText(to)}${unit}`);
          else if (to !== Infinity) parts.push(`dưới ${numberText(to)}${unit}`);
        } else if (from > 0) parts.push(`${numberText(from)}${unit}`);
        else if (to !== Infinity) parts.push(`dưới ${numberText(to)}${unit}`);
      }
    }
    return parts.join(' ');
  };

  const errors: string[] = [];
  const gaps: Combo[] = [];
  const seenOverlap = new Set<string>();
  for (const combo of combos) {
    const attributes = Object.fromEntries(
      Object.entries(combo.values).flatMap(([k, v]) => (v === ABSENT ? [] : [[k, v]])),
    );
    const hit = service.variants.filter((v) => matchesAttributes(v.match, attributes));
    if (hit.length === 0) gaps.push(combo);
    else if (hit.length > 1) {
      const names = hit.map((v) => v.name).join(', ');
      const key = `${hit.map((v) => v.id).join('|')}|${phrase(combo, new Map())}`;
      if (!seenOverlap.has(key)) {
        seenOverlap.add(key);
        errors.push(`${phrase(combo, new Map())} khớp ${hit.length} biến thể: ${names}.`);
      }
    }
  }

  // A run of neighbouring stretches with the same other values reads as one range.
  const single = numberFields.length === 1 ? numberFields[0] : undefined;
  const merged = new Map<Combo, number>();
  const used = new Set<Combo>();
  for (const [i, gap] of gaps.entries()) {
    if (used.has(gap)) continue;
    let end = single ? (gap.ends[single.key] ?? Infinity) : 0;
    if (single && gap.values[single.key] !== ABSENT) {
      for (const next of gaps.slice(i + 1)) {
        const sameRest = fields.every(
          (f) => f.key === single.key || next.values[f.key] === gap.values[f.key],
        );
        if (sameRest && next.values[single.key] === String(end)) {
          used.add(next);
          end = next.ends[single.key] ?? Infinity;
        }
      }
      merged.set(gap, end);
    }
    errors.push(`${phrase(gap, merged)} chưa khớp biến thể nào.`);
  }
  return errors;
}
