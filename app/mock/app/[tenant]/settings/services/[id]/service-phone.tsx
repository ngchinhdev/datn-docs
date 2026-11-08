'use client';

import { ChevronRight, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/sapio/button';
import { CheckRow, Field } from '@/components/sapio/form';
import { SegmentedTabs } from '@/components/sapio/segmented';
import { SegmentTimeline } from '@/components/sapio/segment-timeline';
import { kindClass } from '@/components/sapio/segment-table';
import { Sheet } from '@/components/sapio/sheet';
import { KeyValueList } from '@/components/sapio/detail-layout';
import { formatVnd } from '@/mock/format';
import { visibleRange } from '@/mock/occupation';
import type { SegmentKind } from '@/mock/fixtures';
import { duration } from '@/mock/service-edit';
import { PREVIEW_START, timelineOf } from '@/mock/service-preview';
import { CleanupFields, PriceBox } from './service-sections';
import type { ServiceEditor } from './use-service-editor';

const KINDS: { value: SegmentKind; label: string }[] = [
  { value: 'prep', label: 'Chuẩn bị' },
  { value: 'work', label: 'Làm' },
  { value: 'wait', label: 'Chờ' },
];
const KIND_WORD = { prep: 'Chuẩn bị', work: 'Làm', wait: 'Chờ' } as const;
const KIND_HELP: Record<SegmentKind, string> = {
  prep: 'Chuẩn bị: trước giờ hẹn, khách chưa có mặt.',
  work: 'Làm: khách có mặt, các tài nguyên đã chọn cùng bận.',
  wait: 'Chờ: nhân viên rảnh, tài nguyên đã chọn vẫn bận.',
};

/** Variant tabs, a small timeline, one card per segment and the price, for phones (MH-45). */
export function ServicePhone({ ed }: { ed: ServiceEditor }) {
  const { variant, draft, fixture } = ed;
  const [sheetAt, setSheetAt] = useState<number | null>(null);
  const [priceOpen, setPriceOpen] = useState(false);
  const noun = fixture.template.vocabulary.subject;
  const timeline = timelineOf(variant, fixture.resourceTypes);
  const { segments } = timeline;
  // The label column is 44px on a phone: no room for the second line.
  const types = timeline.types.map(({ small: _small, ...type }) => type);
  const typeName = (id: string) => fixture.resourceTypes.find((t) => t.id === id)?.name ?? '';
  const byLevel = Boolean(variant.pricesByLevel);
  const open = sheetAt === null ? undefined : variant.segments[sheetAt];
  const err = sheetAt === null ? {} : (ed.errors[sheetAt] ?? {});

  return (
    <>
      <SegmentedTabs
        label="Biến thể"
        block
        value={variant.id}
        onChange={ed.setVariantParam}
        items={draft.variants.map((v) => ({ value: v.id, label: v.name || 'Chưa đặt tên' }))}
      />

      <section className="sp-panel" aria-labelledby="m-tl">
        <h2 className="sp-panel__title" id="m-tl">
          Thời gian{noun ? '' : ` · ví dụ hẹn ${PREVIEW_START}`}
        </h2>
        <SegmentTimeline
          mini
          segments={segments}
          types={types}
          cleanup={variant.cleanupMinutes}
          visible={visibleRange(variant)}
          {...(noun ? {} : { exampleStart: PREVIEW_START })}
          labelWidth={44}
          label={`Trục thời gian thu nhỏ, biến thể ${variant.name}`}
        />
      </section>

      <section aria-labelledby="m-seg" className="flex flex-col gap-(--space-2)">
        <div className="flex items-center justify-between">
          <h2 className="sp-panel__title" id="m-seg">
            {variant.segments.length} đoạn
          </h2>
          <Button size="sm" className="h-10!" onClick={ed.segments.add}>
            <Plus size={14} aria-hidden="true" />
            Thêm đoạn
          </Button>
        </div>
        <ul className="sp-cards">
          {variant.segments.map((segment, i) => (
            <li key={i}>
              <button
                type="button"
                className="sp-cards__item w-full border-0 text-left"
                style={
                  ed.selectedSegment === i
                    ? { boxShadow: 'inset 0 0 0 2px var(--brand)' }
                    : undefined
                }
                onClick={() => {
                  ed.setSelectedSegment(i);
                  setSheetAt(i);
                }}
              >
                <span
                  className={`sp-kind sp-kind--${kindClass(segment.kind)} h-10 w-5 rounded-sm`}
                  aria-hidden="true"
                />
                <span className="sp-cards__body">
                  <span className="sp-cards__title">
                    {KIND_WORD[segment.kind]} · {segment.name}
                  </span>
                  <span className="sp-cards__meta">
                    {duration(segment)} phút · {segment.resourceTypeIds.map(typeName).join(', ')}
                  </span>
                </span>
                <ChevronRight size={16} aria-hidden="true" className="text-(--ink-muted)" />
              </button>
            </li>
          ))}
        </ul>
        <CleanupFields ed={ed} />
      </section>

      <section className="sp-panel" aria-labelledby="m-pr">
        <h2 className="sp-panel__title" id="m-pr">
          Giá · {variant.name}
        </h2>
        <KeyValueList
          items={
            byLevel
              ? fixture.staffLevels.map((level, i) => [
                  level,
                  formatVnd(variant.pricesByLevel?.[i] ?? variant.priceVnd),
                ])
              : [['Mọi cấp', formatVnd(variant.priceVnd)]]
          }
        />
        <Button variant="ghost" className="self-start" onClick={() => setPriceOpen(true)}>
          Sửa giá
        </Button>
      </section>

      <Sheet
        open={open !== undefined}
        title={open ? `Đoạn ${(sheetAt ?? 0) + 1} · ${open.name}` : ''}
        onClose={() => setSheetAt(null)}
        footer={
          <>
            <Button
              disabled={variant.segments.length === 1}
              onClick={() => {
                if (sheetAt !== null) ed.segments.remove(sheetAt);
                setSheetAt(null);
              }}
            >
              <Trash2 size={16} aria-hidden="true" />
              Xóa đoạn
            </Button>
            <Button variant="primary" onClick={() => setSheetAt(null)}>
              Xong
            </Button>
          </>
        }
      >
        {open && sheetAt !== null && (
          <>
            <Field id="ms-name" size="md" label="Tên trên lịch" error={err.name}>
              <input
                id="ms-name"
                type="text"
                value={open.name}
                aria-invalid={err.name ? true : undefined}
                onChange={(e) => ed.segments.patch(sheetAt, { name: e.target.value })}
              />
            </Field>
            <Field id="ms-kind" size="md" label="Loại" help={KIND_HELP[open.kind]} error={err.kind}>
              <select
                id="ms-kind"
                value={open.kind}
                aria-invalid={err.kind ? true : undefined}
                onChange={(e) =>
                  ed.segments.patch(sheetAt, { kind: e.target.value as SegmentKind })
                }
              >
                {KINDS.map((k) => (
                  <option key={k.value} value={k.value}>
                    {k.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="ms-min" size="md" label="Thời lượng" suffix="phút" error={err.minutes}>
              <input
                id="ms-min"
                type="text"
                inputMode="numeric"
                value={open.minutesText ?? String(duration(open))}
                aria-invalid={err.minutes ? true : undefined}
                onChange={(e) =>
                  ed.segments.patch(sheetAt, { minutesText: e.target.value.replace(/\D/g, '') })
                }
              />
            </Field>
            <fieldset className="m-0 flex flex-col gap-3.5 border-0 p-0">
              <legend className="sp-field__label pb-2">Chiếm</legend>
              {fixture.resourceTypes.map((type) => {
                const on = open.resourceTypeIds.includes(type.id);
                const locked = open.kind === 'wait' && type.isStaff;
                return (
                  <label key={type.id} className="sp-check">
                    <input
                      type="checkbox"
                      checked={on}
                      disabled={locked}
                      onChange={(e) =>
                        ed.segments.patch(sheetAt, {
                          typeIds: e.target.checked
                            ? [...open.resourceTypeIds, type.id]
                            : open.resourceTypeIds.filter((t) => t !== type.id),
                        })
                      }
                    />
                    <span>
                      {type.name}
                      {locked && (
                        <span className="sp-check__hint">Đoạn chờ không giữ nhân viên</span>
                      )}
                    </span>
                  </label>
                );
              })}
              {err.uses && (
                <span className="sp-field--error">
                  <span className="sp-field__help">{err.uses}</span>
                </span>
              )}
            </fieldset>
          </>
        )}
      </Sheet>

      <Sheet
        open={priceOpen}
        title={`Giá · ${variant.name}`}
        onClose={() => setPriceOpen(false)}
        footer={
          <Button variant="primary" onClick={() => setPriceOpen(false)}>
            Xong
          </Button>
        }
      >
        <CheckRow
          label="Giá khác nhau theo cấp nhân viên"
          checked={byLevel}
          onChange={ed.setByLevel}
        />
        {byLevel ? (
          fixture.staffLevels.map((level, i) => (
            <div key={level} className="flex items-center justify-between gap-3">
              <span className="text-sm">
                Cấp {i + 1} · {level}
              </span>
              <PriceBox
                value={ed.priceValue(i)}
                label={`Giá cấp ${level}`}
                onChange={(text) => ed.setPrice(i, text)}
              />
            </div>
          ))
        ) : (
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm">Mọi cấp</span>
            <PriceBox
              value={ed.priceValue('flat')}
              label="Giá cho mọi cấp"
              onChange={(text) => ed.setPrice('flat', text)}
            />
          </div>
        )}
      </Sheet>
    </>
  );
}
