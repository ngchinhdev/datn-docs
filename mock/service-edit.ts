// Editing a service in the settings pages: segment list operations, checks and change count.
// Pure functions over fixtures; no React.
import type { Service, ServiceSegment, ServiceVariant, SegmentKind, Staff } from './fixtures';
import { visibleMinutes } from './occupation';
import { LIMITS, MINUTES_PROBLEM, PRICE_PROBLEM, priceProblem } from './service-settings';

export const MIN_MINUTES = 5;
export const MAX_MINUTES = 480;
export const MINUTE_STEP = 5;

/** A segment as typed: `minutesText` is what is in the box while it is not a valid duration. */
export type DraftSegment = ServiceSegment & { minutesText?: string };
export type DraftVariant = Omit<ServiceVariant, 'segments'> & { segments: DraftSegment[] };
export type DraftService = Omit<Service, 'variants'> & { variants: DraftVariant[] };

export const duration = (s: ServiceSegment) => s.endMinute - s.startMinute;
const isValidMinutes = (n: number) =>
  Number.isInteger(n) && n >= MIN_MINUTES && n <= MAX_MINUTES && n % MINUTE_STEP === 0;

/** Segments one after the other from minute 0, each keeping its length. */
export function layout(segments: DraftSegment[]): DraftSegment[] {
  let cursor = 0;
  return segments.map((s) => {
    const minutes = duration(s);
    const next = { ...s, startMinute: cursor, endMinute: cursor + minutes };
    cursor += minutes;
    return next;
  });
}

export interface SegmentPatch {
  name?: string;
  kind?: SegmentKind;
  /** Digits as typed. */
  minutesText?: string;
  typeIds?: string[];
}

/** BR-50: a `wait` segment holds no staff, so choosing it clears the staff types at once. */
export function patchSegment(
  segments: DraftSegment[],
  index: number,
  patch: SegmentPatch,
  staffTypeIds: ReadonlySet<string>,
): DraftSegment[] {
  return layout(
    segments.map((s, i) => {
      if (i !== index) return s;
      const next: DraftSegment = { ...s };
      if (patch.name !== undefined) next.name = patch.name;
      if (patch.kind !== undefined) {
        next.kind = patch.kind;
        if (patch.kind === 'wait') {
          next.resourceTypeIds = s.resourceTypeIds.filter((t) => !staffTypeIds.has(t));
        }
      }
      if (patch.typeIds !== undefined) {
        next.resourceTypeIds =
          next.kind === 'wait' ? patch.typeIds.filter((t) => !staffTypeIds.has(t)) : patch.typeIds;
      }
      if (patch.minutesText !== undefined) {
        const n = patch.minutesText === '' ? Number.NaN : Number(patch.minutesText);
        if (isValidMinutes(n)) {
          next.endMinute = next.startMinute + n;
          delete next.minutesText;
        } else next.minutesText = patch.minutesText;
      }
      return next;
    }),
  );
}

export function moveSegment(segments: DraftSegment[], from: number, to: number): DraftSegment[] {
  if (to < 0 || to >= segments.length || from === to) return segments;
  const next = [...segments];
  const [moved] = next.splice(from, 1);
  if (moved) next.splice(to, 0, moved);
  return layout(next);
}

export const removeSegment = (segments: DraftSegment[], index: number) =>
  layout(segments.filter((_, i) => i !== index));

/** A new segment at the end: 15 minutes of work for the staff. */
export function addSegment(segments: DraftSegment[], staffTypeId: string): DraftSegment[] {
  return layout([
    ...segments,
    {
      startMinute: 0,
      endMinute: 15,
      kind: 'work',
      name: 'Đoạn mới',
      resourceTypeIds: [staffTypeId],
    },
  ]);
}

export interface SegmentErrors {
  name?: string;
  kind?: string;
  minutes?: string;
  uses?: string;
}

/** What the segment checks need to know about the staff type (BR-94.26). */
export interface SegmentRules {
  staffTypeIds: ReadonlySet<string>;
  /** Name of the staff type, for the message: "Thợ". */
  staffName: string;
}

/** What is wrong with each segment, by index; segments without a problem are absent. */
export function segmentErrors(
  segments: DraftSegment[],
  rules: SegmentRules,
): Record<number, SegmentErrors> {
  const errors: Record<number, SegmentErrors> = {};
  segments.forEach((s, i) => {
    const e: SegmentErrors = {};
    if (!s.name.trim()) e.name = 'Nhập tên đoạn.';
    if (s.kind === 'prep') {
      if (i !== 0) e.kind = 'Chuẩn bị chỉ đứng đầu. Đưa đoạn này lên đầu hoặc đổi loại.';
      else if (segments[1]?.kind !== 'work') e.kind = 'Sau đoạn Chuẩn bị phải là đoạn Làm.';
    }
    if (
      s.kind === 'wait' &&
      (segments[i - 1]?.kind !== 'work' || segments[i + 1]?.kind !== 'work')
    ) {
      e.kind = 'Đoạn Chờ phải nằm giữa hai đoạn Làm.';
    }
    if (s.minutesText !== undefined) e.minutes = MINUTES_PROBLEM;
    if (s.resourceTypeIds.length === 0) e.uses = 'Chọn ít nhất một loại tài nguyên.';
    else if (s.kind === 'work' && !s.resourceTypeIds.some((t) => rules.staffTypeIds.has(t))) {
      e.uses = `Đoạn Làm cần ${rules.staffName}: mỗi lịch hẹn có một người làm.`;
    }
    if (Object.keys(e).length) errors[i] = e;
  });
  return errors;
}

/** Minutes the customer sees: from the first Làm to the last (BR-51). */
export const visibleOf = (variant: Pick<DraftVariant, 'segments'>) =>
  visibleMinutes({ segments: layout(variant.segments) });

/** The text of "Phần khách thấy tối đa 8 giờ, hiện 8 giờ 30." */
export function visibleProblem(variant: Pick<DraftVariant, 'segments'>): string | null {
  const minutes = visibleOf(variant);
  if (minutes <= LIMITS.visibleMinutes) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `Phần khách thấy tối đa 8 giờ, hiện ${h} giờ${m ? ` ${m}` : ''}.`;
}

/** Problems of a whole variant that no single row shows. */
export function variantProblems(variant: DraftVariant): string[] {
  const problems: string[] = [];
  if (!variant.segments.some((s) => s.kind === 'work')) {
    problems.push(`${variant.name}: cần ít nhất một đoạn Làm.`);
  }
  if (variant.segments.length > LIMITS.segments) {
    problems.push(`${variant.name}: tối đa ${LIMITS.segments} đoạn.`);
  }
  const tooLong = visibleProblem(variant);
  if (tooLong) problems.push(`${variant.name}: ${tooLong}`);
  if (!variant.shortName.trim()) problems.push(`${variant.name}: nhập tên trên lịch.`);
  if (priceProblem(variant.priceVnd)) problems.push(`${variant.name}: ${PRICE_PROBLEM}`);
  if (variant.pricesByLevel?.some((p) => priceProblem(p))) {
    problems.push(`${variant.name}: ${PRICE_PROBLEM}`);
  }
  return problems;
}

export const toDraft = (service: Service): DraftService => ({
  ...service,
  variants: service.variants.map((v) => ({ ...v, segments: v.segments.map((s) => ({ ...s })) })),
});

/** Back to the stored shape: minutes that are not valid keep their last good value. */
export const fromDraft = (draft: DraftService): Service => ({
  ...draft,
  variants: draft.variants.map((v) => ({
    ...v,
    segments: layout(v.segments).map(({ minutesText: _text, ...s }) => s),
    // 0 minutes is no cleaning: the type has no entry (BR-94.28).
    cleanupMinutes: Object.fromEntries(Object.entries(v.cleanupMinutes).filter(([, m]) => m > 0)),
  })),
});

const nameKey = (name: string) => name.trim().replace(/\s+/g, ' ').toLocaleLowerCase('vi');

/** BR-55: variant names of one service are all different. Each repeated name is reported once. */
export function duplicateVariantNames(variants: readonly Pick<ServiceVariant, 'name'>[]): string[] {
  const seen = new Set<string>();
  const repeated = new Map<string, string>();
  for (const { name } of variants) {
    const key = nameKey(name);
    if (!key) continue;
    if (seen.has(key)) repeated.set(key, name.trim());
    seen.add(key);
  }
  return [...repeated.values()];
}

/** Everything the page checks before it lets the owner save. */
export function allProblems(draft: DraftService, rules: SegmentRules) {
  const duplicates = duplicateVariantNames(draft.variants);
  const rows = draft.variants.some((v) => Object.keys(segmentErrors(v.segments, rules)).length > 0);
  const variants = draft.variants.flatMap(variantProblems);
  const nameMissing = draft.variants.some((v) => !v.name.trim());
  return {
    duplicates,
    rows,
    variants,
    nameMissing,
    any: duplicates.length > 0 || rows || variants.length > 0 || nameMissing || !draft.name.trim(),
  };
}

// ---- Change count ----

const same = (a: unknown, b: unknown) =>
  JSON.stringify(a, (_k, v) => (typeof v === 'bigint' ? `${v}n` : v)) ===
  JSON.stringify(b, (_k, v) => (typeof v === 'bigint' ? `${v}n` : v));

const segmentKey = (s: DraftSegment) => ({
  name: s.name,
  kind: s.kind,
  minutes: s.minutesText ?? duration(s),
  uses: [...s.resourceTypeIds].sort(),
});

/** How many things differ from the saved service, for the save bar. Each field counts once. */
export function countChanges(
  draft: DraftService,
  saved: Service,
  skills: readonly string[],
  savedSkills: readonly string[],
  /** Changes outside the service itself that the same save writes: prices of the branches. */
  extra = 0,
): number {
  let n = extra;
  const base: (keyof Service)[] = ['name', 'group', 'description', 'bookableOnline'];
  for (const key of base) if (!same(draft[key], saved[key])) n++;
  if (!same(depositOf(draft), depositOf(saved))) n++;

  const savedIds = new Set(saved.variants.map((v) => v.id));
  n += draft.variants.filter((v) => !savedIds.has(v.id)).length;
  const draftIds = new Set(draft.variants.map((v) => v.id));
  n += saved.variants.filter((v) => !draftIds.has(v.id)).length;
  for (const v of draft.variants) {
    const old = saved.variants.find((x) => x.id === v.id);
    if (!old) continue;
    if (v.name !== old.name) n++;
    if (v.shortName !== old.shortName) n++;
    if (v.priceVnd !== old.priceVnd) n++;
    if (!same(v.pricesByLevel ?? null, old.pricesByLevel ?? null)) n++;
    const keys = Object.keys({ ...v.cleanupMinutes, ...old.cleanupMinutes });
    n += keys.filter((k) => (v.cleanupMinutes[k] ?? 0) !== (old.cleanupMinutes[k] ?? 0)).length;
    const longest = Math.max(v.segments.length, old.segments.length);
    for (let i = 0; i < longest; i++) {
      const a = v.segments[i];
      const b = old.segments[i];
      if (!a || !b || !same(segmentKey(a), segmentKey(b))) n++;
    }
  }
  const before = new Set(savedSkills);
  const after = new Set(skills);
  n += [...after].filter((id) => !before.has(id)).length;
  n += [...before].filter((id) => !after.has(id)).length;
  return n;
}

/** The deposit all variants share; the page edits one number for the service. */
export const depositOf = (service: { variants: { depositVnd?: bigint | undefined }[] }) =>
  service.variants[0]?.depositVnd ?? null;

export const skillsOf = (service: Pick<Service, 'id'>, staff: readonly Staff[]) =>
  staff.filter((s) => s.skillServiceIds.includes(service.id)).map((s) => s.resourceId);
