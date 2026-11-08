// Editing a service in the settings pages: segment list operations, checks and change count.
// Pure functions over fixtures; no React.
import type {
  MatchValue,
  Service,
  ServiceSegment,
  ServiceVariant,
  SegmentKind,
  Staff,
  SubjectField,
} from './fixtures';
import { checkVariantCoverage } from './occupation';

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

/** What is wrong with each segment, by index; segments without a problem are absent. */
export function segmentErrors(segments: DraftSegment[]): Record<number, SegmentErrors> {
  const errors: Record<number, SegmentErrors> = {};
  segments.forEach((s, i) => {
    const e: SegmentErrors = {};
    if (!s.name.trim()) e.name = 'Nhập tên đoạn.';
    if (s.kind === 'prep' && segments.slice(0, i).some((x) => x.kind !== 'prep')) {
      e.kind = 'Chuẩn bị chỉ đứng đầu. Kéo đoạn này lên đầu hoặc đổi loại.';
    }
    if (s.minutesText !== undefined) {
      e.minutes = `Nhập số phút từ ${MIN_MINUTES} đến ${MAX_MINUTES}, bước ${MINUTE_STEP}.`;
    }
    if (s.resourceTypeIds.length === 0) e.uses = 'Chọn ít nhất một loại tài nguyên.';
    if (Object.keys(e).length) errors[i] = e;
  });
  return errors;
}

/** Problems of a whole variant that no single row shows. */
export function variantProblems(variant: DraftVariant): string[] {
  const problems: string[] = [];
  if (!variant.segments.some((s) => s.kind === 'work')) {
    problems.push(`${variant.name}: cần ít nhất một đoạn Làm.`);
  }
  if (variant.priceVnd <= 0n) problems.push(`${variant.name}: nhập giá lớn hơn 0.`);
  if (variant.pricesByLevel?.some((p) => p <= 0n)) {
    problems.push(`${variant.name}: nhập giá lớn hơn 0 cho mọi cấp.`);
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
  })),
});

/** Everything the page checks before it lets the owner save. */
export function allProblems(draft: DraftService, schema: readonly SubjectField[]) {
  const coverage = checkVariantCoverage(fromDraft(draft), schema);
  const rows = draft.variants.some((v) => Object.keys(segmentErrors(v.segments)).length > 0);
  const variants = draft.variants.flatMap(variantProblems);
  const nameMissing = draft.variants.some((v) => !v.name.trim());
  return {
    coverage,
    rows,
    variants,
    nameMissing,
    any: coverage.length > 0 || rows || variants.length > 0 || nameMissing || !draft.name.trim(),
  };
}

// ---- Match conditions (BR-13) ----

export function setMatchEnum(variant: DraftVariant, key: string, value: string): DraftVariant {
  const match = { ...variant.match };
  if (value) match[key] = value;
  else delete match[key];
  return { ...variant, match };
}

export function setMatchRange(
  variant: DraftVariant,
  key: string,
  range: { min?: number | undefined; max?: number | undefined },
): DraftVariant {
  const match = { ...variant.match };
  const next: { min?: number; max?: number } = {};
  if (range.min !== undefined) next.min = range.min;
  if (range.max !== undefined) next.max = range.max;
  if (next.min === undefined && next.max === undefined) delete match[key];
  else match[key] = next;
  return { ...variant, match };
}

export const matchRange = (match: MatchValue | undefined) =>
  match && typeof match !== 'string' ? match : {};

/** "Loài: Chó", "Cân nặng từ 10 kg": the chips under "Áp dụng khi". */
export function describeMatch(
  match: Record<string, MatchValue>,
  schema: readonly SubjectField[],
): string[] {
  return schema.flatMap((field) => {
    const value = match[field.key];
    if (value === undefined) return [];
    if (field.type === 'enum' && typeof value === 'string') {
      return [`${field.label}: ${field.options.find((o) => o.value === value)?.label ?? value}`];
    }
    if (field.type === 'number' && typeof value !== 'string') {
      const unit = field.unit ? ` ${field.unit}` : '';
      const text =
        value.min !== undefined && value.max !== undefined
          ? `từ ${value.min} đến dưới ${value.max}${unit}`
          : value.min !== undefined
            ? `từ ${value.min}${unit}`
            : `dưới ${value.max}${unit}`;
      return [`${field.label} ${text}`];
    }
    return [];
  });
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
): number {
  let n = 0;
  const base: (keyof Service)[] = [
    'name',
    'group',
    'description',
    'variantSelection',
    'bookableOnline',
  ];
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
    if (!same(v.match, old.match)) n++;
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
