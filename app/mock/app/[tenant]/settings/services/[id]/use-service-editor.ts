'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useServiceStore } from '@/components/mock/service-store';
import { useStaffStore } from '@/components/mock/staff-store';
import { useToast } from '@/components/sapio/toast';
import { tenantFixtures, type Service, type Staff } from '@/mock/fixtures';
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
  type DraftService,
  type DraftVariant,
  type SegmentPatch,
} from '@/mock/service-edit';
import { upcomingCount } from '@/mock/services';

export const MAX_CLEANUP = 120;

const digits = (text: string) => text.replace(/\D/g, '');
const parsePrice = (text: string) => {
  const d = digits(text);
  return d ? BigInt(d) : 0n;
};

/** Everything the service detail page edits: the draft, what is wrong with it, and how to save. */
export function useServiceEditor(tenantSlug: string, serviceId: string) {
  const fixture = tenantFixtures.find((f) => f.tenant.slug === tenantSlug) ?? tenantFixtures[0]!;
  const { services, save } = useServiceStore();
  const { staff, save: saveStaff } = useStaffStore();
  const toast = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const saved = services.find((s) => s.id === serviceId) ?? services[0]!;
  const savedSkills = useMemo(() => skillsOf(saved, staff), [saved, staff]);

  const [draft, setDraft] = useState<DraftService>(() => toDraft(saved));
  const [skills, setSkills] = useState<string[]>(savedSkills);
  const [selectedSegment, setSelectedSegment] = useState<number | null>(null);
  /** Text in the cleanup boxes while it is not a valid number of minutes. */
  const [cleanupText, setCleanupText] = useState<Record<string, string>>({});
  /** Text in the price boxes, by variant and level. */
  const [priceText, setPriceText] = useState<Record<string, string>>({});

  const variantId = searchParams.get('variant');
  const variant = draft.variants.find((v) => v.id === variantId) ?? draft.variants[0]!;
  const variantIndex = draft.variants.indexOf(variant);

  const staffTypeIds = useMemo(
    () => new Set(fixture.resourceTypes.filter((t) => t.isStaff).map((t) => t.id)),
    [fixture],
  );
  const schema = fixture.template.subjectSchema;
  const problems = allProblems(draft, schema);
  const cleanupErrors = Object.values(cleanupText).filter((text) => text !== '');
  const changes = countChanges(draft, saved, skills, savedSkills);
  const capable: Staff[] = staff.filter((s) => skills.includes(s.resourceId));
  const upcoming = upcomingCount(fixture.appointments, new Set(saved.variants.map((v) => v.id)));
  const errors = segmentErrors(variant.segments);
  const blocked = problems.any || cleanupErrors.length > 0;

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

  const firstStaffType = fixture.resourceTypes.find((t) => t.isStaff)?.id ?? '';

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
      updateCurrent((v) => ({ ...v, segments: addSegment(v.segments, firstStaffType) }));
      setSelectedSegment(variant.segments.length);
    },
  };

  const cleanupKey = (typeId: string) => `${variant.id}:${typeId}`;
  const setCleanup = (typeId: string, text: string) => {
    const clean = digits(text);
    const n = clean === '' ? 0 : Number(clean);
    const key = cleanupKey(typeId);
    if (clean !== '' && n > MAX_CLEANUP) {
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
    return text !== undefined && text !== '' ? `Tối đa ${MAX_CLEANUP} phút.` : undefined;
  };

  /** Price boxes: `level` is an index into the levels, or `flat` when every level pays the same. */
  const priceKey = (level: number | 'flat') => `${variant.id}:${level}`;
  const priceValue = (level: number | 'flat') => {
    const text = priceText[priceKey(level)];
    if (text !== undefined) return text;
    const value = level === 'flat' ? variant.priceVnd : (variant.pricesByLevel?.[level] ?? 0n);
    return value === 0n ? '' : new Intl.NumberFormat('vi-VN').format(value);
  };
  const setPrice = (level: number | 'flat', text: string) => {
    const value = parsePrice(text);
    setPriceText((t) => ({
      ...t,
      [priceKey(level)]: value === 0n ? '' : new Intl.NumberFormat('vi-VN').format(value),
    }));
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

  const addVariant = (copyOf?: DraftVariant) => {
    const base = copyOf ?? variant;
    let n = draft.variants.length + 1;
    while (draft.variants.some((v) => v.id === `${draft.id}-v${n}`)) n++;
    const id = `${draft.id}-v${n}`;
    const name = copyOf ? `${base.name} (bản sao)` : 'Biến thể mới';
    const next: DraftVariant = {
      ...base,
      id,
      name,
      shortName: copyOf ? `${base.shortName} 2` : name,
      match: copyOf ? { ...base.match } : {},
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
    return value ? new Intl.NumberFormat('vi-VN').format(value) : '';
  })();

  const toggleSkill = (resourceId: string, on: boolean) =>
    setSkills((list) => (on ? [...list, resourceId] : list.filter((id) => id !== resourceId)));

  function discard() {
    setDraft(toDraft(saved));
    setSkills(savedSkills);
    setCleanupText({});
    setPriceText({});
    setSelectedSegment(null);
  }

  /** Returns false when something is still wrong. */
  function submit(): boolean {
    if (blocked) return false;
    const next: Service = fromDraft(draft);
    // BR-12, BR-59: appointments already booked keep their own bookings and prices; only the
    // service itself changes, so nothing else is rewritten here.
    save(next);
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
    setCleanupText({});
    setPriceText({});
    toast({
      text: `Đã lưu ${next.name}. ${upcoming} lịch đã đặt giữ thời gian và giá cũ.`,
    });
    return true;
  }

  return {
    fixture,
    saved,
    draft,
    patchService,
    setDescription,
    variant,
    variantIndex,
    setVariantParam,
    updateCurrent,
    addVariant,
    removeVariant,
    segments,
    selectedSegment,
    setSelectedSegment,
    errors,
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
    setPrice,
    setByLevel,
    depositText,
    setDeposit,
    staffTypeIds,
    schema,
    discard,
    submit,
  };
}

export type ServiceEditor = ReturnType<typeof useServiceEditor>;
