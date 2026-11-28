'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useScheduleStore } from '@/components/mock/schedule-store';
import { useServiceStore } from '@/components/mock/service-store';
import { useStaffStore } from '@/components/mock/staff-store';
import { useToast } from '@/components/sapio/toast';
import { cleanName, isActive } from '@/mock/branch-settings';
import { tenantFixtures, type Branch, type Service, type Staff } from '@/mock/fixtures';
import {
  addSegment,
  allProblems,
  countChanges,
  fromDraft,
  moveSegment,
  patchSegment,
  removeSegment,
  segmentErrors,
  skillsOf,
  toDraft,
  visibleProblem,
  type DraftService,
  type DraftVariant,
  type SegmentPatch,
  type SegmentRules,
} from '@/mock/service-edit';
import {
  archiveService,
  cleanupProblem,
  LIMITS,
  missingResources,
  PRICE_PROBLEM,
  priceProblem,
  restoreService,
  serviceNameTaken,
} from '@/mock/service-settings';
import { upcomingCount } from '@/mock/services';
import { MOCK_NOW } from '@/mock/time';

export const MAX_CLEANUP = LIMITS.cleanupMinutes;

const digits = (text: string) => text.replace(/\D/g, '');
const vnd = new Intl.NumberFormat('vi-VN');
const parsePrice = (text: string) => {
  const d = digits(text);
  return d ? BigInt(d) : 0n;
};

/** Prices of the branches in use for the variants of a service: branch id, then variant id. */
type BranchPrices = Record<string, Record<string, bigint>>;

function branchPricesOf(branches: readonly Branch[], service: Service): BranchPrices {
  const out: BranchPrices = {};
  for (const branch of branches.filter(isActive)) {
    for (const variant of service.variants) {
      const price = branch.prices?.[variant.id];
      if (price !== undefined) (out[branch.id] ??= {})[variant.id] = price;
    }
  }
  return out;
}

/** How many (branch, variant) prices differ between two sets, for the save bar. */
function branchPriceChanges(a: BranchPrices, b: BranchPrices, variantIds: ReadonlySet<string>) {
  let n = 0;
  const branchIds = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const branchId of branchIds) {
    for (const variantId of variantIds) {
      if (a[branchId]?.[variantId] !== b[branchId]?.[variantId]) n++;
    }
  }
  return n;
}

/** Everything the service detail page edits: the draft, what is wrong with it, and how to save. */
export function useServiceEditor(tenantSlug: string, serviceId: string) {
  const fixture = tenantFixtures.find((f) => f.tenant.slug === tenantSlug) ?? tenantFixtures[0]!;
  const { services, groups, save, setServices } = useServiceStore();
  const { staff, save: saveStaff } = useStaffStore();
  const schedule = useScheduleStore();
  const toast = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const saved = services.find((s) => s.id === serviceId) ?? services[0]!;
  const savedSkills = useMemo(() => skillsOf(saved, staff), [saved, staff]);
  const resourceTypes = schedule.resourceTypes;
  const branches = useMemo(
    () => [schedule.branch, ...schedule.extraBranches].filter(isActive),
    [schedule.branch, schedule.extraBranches],
  );
  const savedBranchPrices = useMemo(() => branchPricesOf(branches, saved), [branches, saved]);

  const [draft, setDraft] = useState<DraftService>(() => toDraft(saved));
  const [skills, setSkills] = useState<string[]>(savedSkills);
  const [branchPrices, setBranchPrices] = useState<BranchPrices>(savedBranchPrices);
  const [selectedSegment, setSelectedSegment] = useState<number | null>(null);
  /** Text in the cleanup boxes while it is not a valid number of minutes. */
  const [cleanupText, setCleanupText] = useState<Record<string, string>>({});
  /** Text in the price boxes, by variant and level. */
  const [priceText, setPriceText] = useState<Record<string, string>>({});
  /** Text in the branch price boxes, by branch and variant. */
  const [branchText, setBranchText] = useState<Record<string, string>>({});
  const [restoreTaken, setRestoreTaken] = useState(false);

  const variantId = searchParams.get('variant');
  const variant = draft.variants.find((v) => v.id === variantId) ?? draft.variants[0]!;
  const variantIndex = draft.variants.indexOf(variant);
  const readOnly = Boolean(saved.archivedAt);
  /**
   * BR-94.29: the prices of the branches show where there are two or more branches in use, or when
   * the variant already has a price of its own in a branch in use, so it can be seen and cleared.
   */
  const showBranchPrices =
    branches.length >= 2 ||
    branches.some((b) => savedBranchPrices[b.id]?.[variant.id] !== undefined);

  const staffType = resourceTypes.find((t) => t.isStaff);
  const staffTypeIds = useMemo(
    () => new Set(resourceTypes.filter((t) => t.isStaff).map((t) => t.id)),
    [resourceTypes],
  );
  const rules: SegmentRules = useMemo(
    () => ({ staffTypeIds, staffName: staffType?.name ?? 'nhân viên' }),
    [staffTypeIds, staffType],
  );
  const problems = allProblems(draft, rules);
  const cleanupErrors = Object.values(cleanupText).filter((text) => text !== '');
  const priceEmpty = Object.values(priceText).some((text) => text === '');

  const variantIds = new Set(draft.variants.map((v) => v.id));
  /** Prices of branches for variants that are still in the draft. */
  const liveBranchPrices = useMemo(() => {
    const out: BranchPrices = {};
    for (const [branchId, byVariant] of Object.entries(branchPrices)) {
      for (const [id, price] of Object.entries(byVariant)) {
        if (variantIds.has(id)) (out[branchId] ??= {})[id] = price;
      }
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchPrices, draft.variants]);
  const allVariantIds = new Set([...saved.variants.map((v) => v.id), ...variantIds]);
  const branchChanges = branchPriceChanges(savedBranchPrices, liveBranchPrices, allVariantIds);
  const branchPriceBad = Object.values(liveBranchPrices).some((byVariant) =>
    Object.values(byVariant).some((price) => priceProblem(price)),
  );

  const nameError = !cleanName(draft.name)
    ? 'Nhập tên dịch vụ.'
    : serviceNameTaken(services, draft.name, saved.id)
      ? 'Đã có dịch vụ tên này.'
      : undefined;
  const changes = countChanges(draft, saved, skills, savedSkills, branchChanges);
  const capable: Staff[] = staff.filter((s) => skills.includes(s.resourceId));
  const upcoming = upcomingCount(fixture.appointments, new Set(saved.variants.map((v) => v.id)));
  const errors = segmentErrors(variant.segments, rules);
  const tooLong = visibleProblem(variant);
  const blocked =
    problems.any || cleanupErrors.length > 0 || priceEmpty || branchPriceBad || Boolean(nameError);

  /** BR-94.30: branches in use without a resource of a type a variant needs; saving is still allowed. */
  const missing = useMemo(
    () => missingResources(draft.variants, branches, schedule.resources, resourceTypes),
    [draft.variants, branches, schedule.resources, resourceTypes],
  );

  const setVariantParam = (id: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('variant', id);
    setSelectedSegment(null);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const patchService = (patch: Partial<DraftService>) => setDraft((d) => ({ ...d, ...patch }));
  const setDescription = (text: string) =>
    setDraft((d) => {
      const { description: _old, ...rest } = d;
      return text ? { ...rest, description: text } : rest;
    });
  const updateVariant = (id: string, change: (v: DraftVariant) => DraftVariant) =>
    setDraft((d) => ({ ...d, variants: d.variants.map((v) => (v.id === id ? change(v) : v)) }));
  const updateCurrent = (change: (v: DraftVariant) => DraftVariant) =>
    updateVariant(variant.id, change);

  const firstStaffType = staffType?.id ?? '';

  const segments = {
    patch: (i: number, patch: SegmentPatch) =>
      updateCurrent((v) => ({
        ...v,
        segments: patchSegment(v.segments, i, patch, staffTypeIds),
      })),
    move: (from: number, to: number) => {
      updateCurrent((v) => ({ ...v, segments: moveSegment(v.segments, from, to) }));
      setSelectedSegment(to);
    },
    remove: (i: number) => {
      updateCurrent((v) => ({ ...v, segments: removeSegment(v.segments, i) }));
      setSelectedSegment(null);
    },
    add: () => {
      if (variant.segments.length >= LIMITS.segments) return;
      updateCurrent((v) => ({ ...v, segments: addSegment(v.segments, firstStaffType) }));
      setSelectedSegment(variant.segments.length);
    },
    canAdd: variant.segments.length < LIMITS.segments,
  };

  // ---- Cleanup (BR-94.28) ----

  const cleanupKey = (typeId: string) => `${variant.id}:${typeId}`;
  const setCleanup = (typeId: string, text: string) => {
    const clean = digits(text);
    const n = clean === '' ? 0 : Number(clean);
    const key = cleanupKey(typeId);
    if (clean !== '' && cleanupProblem(n)) {
      setCleanupText((t) => ({ ...t, [key]: clean }));
      return;
    }
    setCleanupText((t) => {
      const { [key]: _drop, ...rest } = t;
      return clean === '' ? { ...rest, [key]: '' } : rest;
    });
    updateCurrent((v) => ({ ...v, cleanupMinutes: { ...v.cleanupMinutes, [typeId]: n } }));
  };
  const cleanupValue = (typeId: string) =>
    cleanupText[cleanupKey(typeId)] ?? String(variant.cleanupMinutes[typeId] ?? 0);
  const cleanupError = (typeId: string) => {
    const text = cleanupText[cleanupKey(typeId)];
    return text !== undefined && text !== '' ? 'Nhập số phút từ 0 đến 120, bước 5.' : undefined;
  };

  // ---- Prices (BR-94.19) ----

  /** Price boxes: `level` is an index into the levels, or `flat` when every level pays the same. */
  const priceKey = (level: number | 'flat') => `${variant.id}:${level}`;
  const priceValueOf = (level: number | 'flat') =>
    level === 'flat' ? variant.priceVnd : (variant.pricesByLevel?.[level] ?? 0n);
  const priceValue = (level: number | 'flat') => {
    const text = priceText[priceKey(level)];
    return text !== undefined ? text : vnd.format(priceValueOf(level));
  };
  const priceError = (level: number | 'flat') => {
    const text = priceText[priceKey(level)];
    if (text === '') return PRICE_PROBLEM;
    return priceProblem(priceValueOf(level)) ?? undefined;
  };
  const setPrice = (level: number | 'flat', text: string) => {
    const clean = digits(text);
    const value = clean === '' ? 0n : BigInt(clean);
    setPriceText((t) => ({ ...t, [priceKey(level)]: clean === '' ? '' : vnd.format(value) }));
    updateCurrent((v) => {
      if (level === 'flat') {
        return v.pricesByLevel ? v : { ...v, priceVnd: value };
      }
      const prices = [...(v.pricesByLevel ?? [])];
      prices[level] = value;
      return { ...v, pricesByLevel: prices, priceVnd: prices[0] ?? v.priceVnd };
    });
  };
  /** Turns the price by level on (every level starts at today's price) or off. */
  const setByLevel = (on: boolean) => {
    setPriceText({});
    updateCurrent((v) => {
      if (!on) {
        const { pricesByLevel: _levels, ...rest } = v;
        return rest;
      }
      return {
        ...v,
        pricesByLevel: fixture.staffLevels.map(() => v.priceVnd),
      };
    });
  };

  // ---- Prices of the branches (BR-94.29) ----

  const branchKey = (branchId: string) => `${branchId}:${variant.id}`;
  const branchPriceOf = (branchId: string): bigint | undefined =>
    branchPrices[branchId]?.[variant.id];
  const branchPriceValue = (branchId: string) => {
    const text = branchText[branchKey(branchId)];
    if (text !== undefined) return text;
    const price = branchPriceOf(branchId);
    return price === undefined ? '' : vnd.format(price);
  };
  const branchPriceError = (branchId: string) => {
    const price = branchPriceOf(branchId);
    return price === undefined ? undefined : (priceProblem(price) ?? undefined);
  };
  const setBranchPrice = (branchId: string, text: string) => {
    const clean = digits(text);
    setBranchText((t) => ({
      ...t,
      [branchKey(branchId)]: clean === '' ? '' : vnd.format(BigInt(clean)),
    }));
    setBranchPrices((all) => {
      const own = { ...all[branchId] };
      if (clean === '') delete own[variant.id];
      else own[variant.id] = BigInt(clean);
      return { ...all, [branchId]: own };
    });
  };

  // ---- Variants (BR-94.17 to BR-94.21) ----

  const canAddVariant = draft.variants.length < LIMITS.variants;
  const addVariant = (copyOf?: DraftVariant) => {
    if (!canAddVariant) return;
    const base = copyOf ?? variant;
    let n = draft.variants.length + 1;
    while (draft.variants.some((v) => v.id === `${draft.id}-v${n}`)) n++;
    const id = `${draft.id}-v${n}`;
    const name = copyOf
      ? `${base.name.slice(0, LIMITS.variantName - 10)} (bản sao)`
      : 'Biến thể mới';
    const next: DraftVariant = {
      ...base,
      id,
      name,
      shortName: (copyOf ? `${base.shortName} 2` : name).slice(0, LIMITS.shortName),
      segments: base.segments.map((s) => ({ ...s })),
      cleanupMinutes: { ...base.cleanupMinutes },
    };
    setDraft((d) => ({ ...d, variants: [...d.variants, next] }));
    setVariantParam(id);
  };
  const removeVariant = (id: string) => {
    if (draft.variants.length <= 1) return;
    const rest = draft.variants.filter((v) => v.id !== id);
    setDraft((d) => ({ ...d, variants: rest }));
    if (variant.id === id) setVariantParam(rest[0]!.id);
  };
  /** BR-94.20: the order of the list is the order the customer sees. */
  const moveVariant = (id: string, dir: -1 | 1) =>
    setDraft((d) => {
      const at = d.variants.findIndex((v) => v.id === id);
      const to = at + dir;
      if (at < 0 || to < 0 || to >= d.variants.length) return d;
      const next = [...d.variants];
      [next[at], next[to]] = [next[to]!, next[at]!];
      return { ...d, variants: next };
    });

  const variantNameError = (v: DraftVariant): string | undefined => {
    if (!v.name.trim()) return 'Nhập tên biến thể.';
    return problems.duplicates.map((n) => n.toLowerCase()).includes(cleanName(v.name).toLowerCase())
      ? 'Tên này đã có ở biến thể khác.'
      : undefined;
  };
  const shortNameError = (v: DraftVariant) =>
    v.shortName.trim() ? undefined : 'Nhập tên trên lịch.';

  const setDeposit = (text: string) => {
    const value = parsePrice(text);
    setDraft((d) => ({
      ...d,
      variants: d.variants.map((v) => {
        const { depositVnd: _old, ...rest } = v;
        return value === 0n ? rest : { ...rest, depositVnd: value };
      }),
    }));
  };
  const depositText = (() => {
    const value = draft.variants[0]?.depositVnd;
    return value ? vnd.format(value) : '';
  })();

  const toggleSkill = (resourceId: string, on: boolean) =>
    setSkills((list) => (on ? [...list, resourceId] : list.filter((id) => id !== resourceId)));

  function discard() {
    setDraft(toDraft(saved));
    setSkills(savedSkills);
    setBranchPrices(savedBranchPrices);
    setCleanupText({});
    setPriceText({});
    setBranchText({});
    setSelectedSegment(null);
  }

  /** BR-94.29: writes the prices of the branches for the variants of this service. */
  function writeBranchPrices(next: Service) {
    const keep = new Set(next.variants.map((v) => v.id));
    const apply = (branch: Branch): Branch => {
      if (!isActive(branch)) return branch;
      const prices = { ...branch.prices };
      for (const id of allVariantIds) delete prices[id];
      for (const [id, price] of Object.entries(liveBranchPrices[branch.id] ?? {})) {
        if (keep.has(id)) prices[id] = price;
      }
      const { prices: _old, ...rest } = branch;
      return Object.keys(prices).length > 0 ? { ...rest, prices } : rest;
    };
    schedule.saveSettings({
      branch: apply(schedule.branch),
      extraBranches: schedule.extraBranches.map(apply),
    });
  }

  /** Returns false when something is still wrong. */
  function submit(): boolean {
    if (blocked || readOnly) return false;
    const next: Service = fromDraft(draft);
    // BR-12, BR-59: appointments already booked keep their own bookings and prices; only the
    // service itself changes, so nothing else is rewritten here.
    save(next);
    if (branchChanges > 0) writeBranchPrices(next);
    for (const member of staff) {
      const has = member.skillServiceIds.includes(next.id);
      const wants = skills.includes(member.resourceId);
      if (has !== wants) {
        saveStaff({
          ...member,
          skillServiceIds: wants
            ? [...member.skillServiceIds, next.id]
            : member.skillServiceIds.filter((id) => id !== next.id),
        });
      }
    }
    setDraft(toDraft(next));
    setBranchPrices(liveBranchPrices);
    setCleanupText({});
    setPriceText({});
    setBranchText({});
    toast({
      text:
        upcoming > 0
          ? `Đã lưu ${next.name}. ${upcoming} lịch đã đặt giữ thời gian và giá cũ.`
          : `Đã lưu ${next.name}.`,
    });
    return true;
  }

  /** BR-94.12: out of use; the list is the place to see it. */
  function archive() {
    setServices(archiveService(services, saved.id, MOCK_NOW));
    toast({ text: `Đã ngừng dùng ${saved.name}.` });
  }

  /** BR-94.13: in use again unless the name now belongs to another service in use. */
  function restore() {
    if (serviceNameTaken(services, saved.name, saved.id)) {
      setRestoreTaken(true);
      return;
    }
    setRestoreTaken(false);
    setServices(restoreService(services, saved.id));
    toast({ text: `Đã dùng lại ${saved.name}.` });
  }

  return {
    fixture,
    saved,
    draft,
    readOnly,
    groups,
    resourceTypes,
    rules,
    patchService,
    setDescription,
    nameError,
    variant,
    variantIndex,
    setVariantParam,
    updateCurrent,
    canAddVariant,
    addVariant,
    removeVariant,
    moveVariant,
    variantNameError,
    shortNameError,
    segments,
    selectedSegment,
    setSelectedSegment,
    errors,
    tooLong,
    problems,
    blocked,
    changes,
    upcoming,
    skills,
    toggleSkill,
    staff,
    capable,
    cleanupValue,
    setCleanup,
    cleanupError,
    priceValue,
    priceError,
    setPrice,
    setByLevel,
    branches,
    showBranchPrices,
    branchPriceValue,
    branchPriceError,
    setBranchPrice,
    branchPriceList: (variantId: string) =>
      Object.values(liveBranchPrices).flatMap((byVariant) =>
        byVariant[variantId] === undefined ? [] : [byVariant[variantId]],
      ),
    missing,
    depositText,
    setDeposit,
    staffTypeIds,
    discard,
    submit,
    archive,
    restore,
    restoreTaken,
  };
}

export type ServiceEditor = ReturnType<typeof useServiceEditor>;
