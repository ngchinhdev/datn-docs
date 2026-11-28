'use client';

import { ArrowDown, ArrowUp, ChevronRight, Plus, Trash2 } from 'lucide-react';
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
import { LIMITS } from '@/mock/service-settings';
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
  const resourceTypes = ed.resourceTypes;
  const [sheetAt, setSheetAt] = useState<number | null>(null);
  const [priceOpen, setPriceOpen] = useState(false);
  const timeline = timelineOf(variant, resourceTypes);
  const { segments } = timeline;
  // The label column is 44px on a phone: no room for the second line.
  const types = timeline.types.map(({ small: _small, ...type }) => type);
  const typeName = (id: string) => resourceTypes.find((t) => t.id === id)?.name ?? '';
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
          Thời gian · ví dụ hẹn {PREVIEW_START}
        </h2>
        <SegmentTimeline
          mini
          segments={segments}
          types={types}
          cleanup={variant.cleanupMinutes}
          visible={visibleRange(variant)}
          exampleStart={PREVIEW_START}
          labelWidth={44}
          label={`Trục thời gian thu nhỏ, biến thể ${variant.name}`}
        />
      </section>

      <section aria-labelledby="m-seg" className="flex flex-col gap-(--space-2)">
        <div className="flex items-center justify-between">
          <h2 className="sp-panel__title" id="m-seg">
            {variant.segments.length} đoạn
          </h2>
          <Button
            size="sm"
            className="h-10!"
            disabled={!ed.segments.canAdd}
            onClick={ed.segments.add}
          >
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
                  {ed.errors[i] && (
                    <span className="sp-cards__meta text-(--danger)">
                      {Object.values(ed.errors[i]!)[0]}
                    </span>
                  )}
                </span>
                <ChevronRight size={16} aria-hidden="true" className="text-(--ink-muted)" />
              </button>
            </li>
          ))}
        </ul>
        {!variant.segments.some((s) => s.kind === 'work') && (
          <p className="sp-field--error m-0" role="status">
            <span className="sp-field__help">
              Cần ít nhất một đoạn Làm: đó là lúc khách có mặt.
            </span>
          </p>
        )}
        {ed.tooLong && (
          <p className="sp-field--error m-0" role="status">
            <span className="sp-field__help">{ed.tooLong}</span>
          </p>
        )}
        <CleanupFields ed={ed} />
      </section>

      <section className="sp-panel" aria-labelledby="m-pr">
        <h2 className="sp-panel__title" id="m-pr">
          Giá · {variant.name}
        </h2>
        <KeyValueList
          items={[
            ...(byLevel
              ? fixture.staffLevels.map((level, i): [string, string] => [
                  level,
                  formatVnd(variant.pricesByLevel?.[i] ?? variant.priceVnd),
                ])
              : ([['Mọi cấp', formatVnd(variant.priceVnd)]] as [string, string][])),
            ...(ed.showBranchPrices
              ? ed.branches.flatMap((branch): [string, string][] => {
                  const text = ed.branchPriceValue(branch.id);
                  return text === '' ? [] : [[branch.name, `${text} ₫`]];
                })
              : []),
          ]}
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
            <span className="flex gap-2">
              <Button
                size="sm"
                disabled={sheetAt === 0}
                onClick={() => {
                  ed.segments.move(sheetAt, sheetAt - 1);
                  setSheetAt(sheetAt - 1);
                }}
              >
                <ArrowUp size={14} aria-hidden="true" />
                Lên
              </Button>
              <Button
                size="sm"
                disabled={sheetAt === variant.segments.length - 1}
                onClick={() => {
                  ed.segments.move(sheetAt, sheetAt + 1);
                  setSheetAt(sheetAt + 1);
                }}
              >
                <ArrowDown size={14} aria-hidden="true" />
                Xuống
              </Button>
            </span>
            <Field id="ms-name" size="md" label="Tên trên lịch" error={err.name}>
              <input
                id="ms-name"
                type="text"
                maxLength={LIMITS.segmentLabel}
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
              {resourceTypes.map((type) => {
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
            <div key={level} className="flex items-start justify-between gap-3">
              <span className="pt-2 text-sm">
                Cấp {i + 1} · {level}
              </span>
              <PriceBox
                value={ed.priceValue(i)}
                label={`Giá cấp ${level}`}
                error={ed.priceError(i)}
                onChange={(text) => ed.setPrice(i, text)}
              />
            </div>
          ))
        ) : (
          <div className="flex items-start justify-between gap-3">
            <span className="pt-2 text-sm">Mọi cấp</span>
            <PriceBox
              value={ed.priceValue('flat')}
              label="Giá cho mọi cấp"
              error={ed.priceError('flat')}
              onChange={(text) => ed.setPrice('flat', text)}
            />
          </div>
        )}
        {ed.showBranchPrices && (
          <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
            <legend className="sp-field__label pb-2">Giá riêng chi nhánh</legend>
            {ed.branches.map((branch) => (
              <div key={branch.id} className="flex items-start justify-between gap-3">
                <span className="pt-2 text-sm">{branch.name}</span>
                <PriceBox
                  value={ed.branchPriceValue(branch.id)}
                  label={`Giá ${variant.name} ở ${branch.name}`}
                  placeholder={`Giá gốc ${formatVnd(variant.priceVnd)}`}
                  error={ed.branchPriceError(branch.id)}
                  allowEmpty
                  onChange={(text) => ed.setBranchPrice(branch.id, text)}
                />
              </div>
            ))}
          </fieldset>
        )}
      </Sheet>
    </>
  );
}
