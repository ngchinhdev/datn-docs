'use client';

import { Copy, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/sapio/button';
import { CheckRow, Field, FormSection } from '@/components/sapio/form';
import { SegmentTable } from '@/components/sapio/segment-table';
import { SegmentTimeline, TimelineLegend } from '@/components/sapio/segment-timeline';
import { Tip } from '@/components/sapio/tooltip';
import { cn } from '@/lib/utils';
import { formatVnd } from '@/mock/format';
import { matchRange, describeMatch, setMatchEnum, setMatchRange } from '@/mock/service-edit';
import { PREVIEW_START, timelineOf } from '@/mock/service-preview';
import { visibleRange } from '@/mock/occupation';
import { anyPrice, durationText, priceText, upcomingCount } from '@/mock/services';
import type { ServiceEditor } from './use-service-editor';

const PlusIcon = <Plus size={14} aria-hidden="true" />;

/** Section title and one line, with the button that belongs to it on the right. */
function StackHead({
  id,
  title,
  desc,
  action,
}: {
  id: string;
  title: string;
  desc: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="sp-form-section__head">
      <div>
        <h2 className="sp-form-section__title" id={id}>
          {title}
        </h2>
        <p className="sp-form-section__desc">{desc}</p>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

const numberText = (n: number | undefined) => (n === undefined ? '' : String(n).replace('.', ','));

/** "Thông tin chung": name, group, text for the customer, deposit. */
export function GeneralSection({ ed }: { ed: ServiceEditor }) {
  const { draft, fixture } = ed;
  return (
    <FormSection
      id="sv-s1"
      title="Thông tin chung"
      description="Khách thấy tên, nhóm và mô tả ở trang đặt lịch."
    >
      <Field
        id="sv-name"
        label="Tên dịch vụ"
        error={draft.name.trim() ? undefined : 'Nhập tên dịch vụ.'}
      >
        <input
          id="sv-name"
          type="text"
          value={draft.name}
          aria-invalid={draft.name.trim() ? undefined : true}
          onChange={(e) => ed.patchService({ name: e.target.value })}
        />
      </Field>
      <Field id="sv-group" label="Nhóm">
        <select
          id="sv-group"
          value={draft.group}
          onChange={(e) => ed.patchService({ group: e.target.value })}
        >
          {fixture.template.serviceGroups.map((group) => (
            <option key={group}>{group}</option>
          ))}
        </select>
      </Field>
      <Field id="sv-desc" label="Mô tả cho khách" optional full area>
        <textarea
          id="sv-desc"
          rows={2}
          value={draft.description ?? ''}
          onChange={(e) => ed.setDescription(e.target.value)}
        />
      </Field>
      <Field
        id="sv-dep"
        label="Đặt cọc khi đặt online"
        suffix="₫"
        help="Để trống nếu không cần cọc. Khách không đến 2 lần thì luôn phải cọc (BR-10)."
      >
        <input
          id="sv-dep"
          type="text"
          inputMode="numeric"
          value={ed.depositText}
          aria-describedby="sv-dep-help"
          onChange={(e) => ed.setDeposit(e.target.value)}
        />
      </Field>
    </FormSection>
  );
}

/** "Biến thể": how the variant is chosen, the table, and the name and conditions of the one being edited. */
export function VariantsSection({ ed }: { ed: ServiceEditor }) {
  const { draft, variant, fixture, schema, staff, problems } = ed;
  const pathname = usePathname();
  const capable = ed.capable;
  const bySubject = draft.variantSelection === 'subject';
  const noun = fixture.template.vocabulary.subject;
  const subjectWord = noun ? `thông tin của ${noun}` : 'thông tin khách';

  return (
    <section className="sp-form-section sp-form-section--stack" aria-labelledby="sv-s2">
      <StackHead
        id="sv-s2"
        title="Biến thể"
        desc={
          bySubject
            ? `Hệ thống chọn biến thể theo ${noun ? `${priceWords(ed)} của ${noun} khách đã nhập` : 'thông tin khách đã nhập'} (BR-13).`
            : 'Mỗi biến thể có thời gian và giá riêng (BR-13).'
        }
        action={
          <Button size="sm" onClick={() => ed.addVariant()}>
            {PlusIcon}
            Thêm biến thể
          </Button>
        }
      />
      <div className="flex flex-wrap items-center gap-(--space-3)">
        <span id="vm-label" className="text-[13px] leading-[18px] font-medium">
          Chọn biến thể
        </span>
        <div className="sp-segmented" role="group" aria-labelledby="vm-label">
          <button
            type="button"
            className="sp-segmented__item"
            aria-pressed={!bySubject}
            onClick={() => ed.patchService({ variantSelection: 'customer' })}
          >
            Khách tự chọn
          </button>
          <button
            type="button"
            className="sp-segmented__item"
            aria-pressed={bySubject}
            onClick={() => ed.patchService({ variantSelection: 'subject' })}
          >
            Theo {subjectWord}
          </button>
        </div>
        {!bySubject && !noun && (
          <span className="sp-field__help m-0">
            Salon tóc không hỏi thêm thông tin, khách chọn &ldquo;Tóc ngắn&rdquo; hay &ldquo;Tóc
            dài&rdquo; ở bước chọn dịch vụ.
          </span>
        )}
      </div>
      {bySubject && (
        <div
          className={cn('sp-banner', problems.coverage.length > 0 && 'sp-banner--warning')}
          role="status"
          style={{ borderRadius: 'var(--radius-md)' }}
        >
          <span className="sp-banner__text">
            {problems.coverage.length === 0 ? (
              <>
                <strong>Mọi {noun ?? 'khách'} đều khớp đúng một biến thể.</strong> Thiếu hay trùng
                điều kiện thì không lưu được.
              </>
            ) : (
              <>
                <strong>Chưa lưu được:</strong>
                <span className="mt-1 flex flex-col">
                  {problems.coverage.map((line) => (
                    <span key={line}>{line}</span>
                  ))}
                </span>
              </>
            )}
          </span>
        </div>
      )}
      <div
        className="sp-table-wrap"
        tabIndex={0}
        role="region"
        aria-label={`Biến thể của ${draft.name}, cuộn được`}
      >
        <table className="sp-table">
          <caption className="sp-sr-only">Biến thể của {draft.name}</caption>
          <thead>
            <tr>
              <th scope="col">Biến thể</th>
              <th scope="col">{bySubject ? 'Áp dụng khi' : 'Tên trên lịch'}</th>
              <th scope="col">Khách thấy</th>
              <th scope="col" className="sp-table__num">
                Giá
              </th>
              <th scope="col">
                <span className="sp-sr-only">Thao tác</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {draft.variants.map((v) => {
              const current = v.id === variant.id;
              return (
                <tr key={v.id} aria-selected={current}>
                  <td>
                    <span className="sp-table__primary">
                      <Link
                        href={`${pathname}?variant=${v.id}`}
                        replace
                        scroll={false}
                        aria-current={current ? 'true' : undefined}
                        onClick={(e) => {
                          e.preventDefault();
                          ed.setVariantParam(v.id);
                        }}
                      >
                        {v.name || 'Chưa đặt tên'}
                      </Link>
                    </span>
                    {current && <span className="sp-table__secondary">Đang sửa bên dưới</span>}
                  </td>
                  <td>
                    {bySubject ? (
                      <span className="sp-chips">
                        {describeMatch(v.match, schema).map((chip) => (
                          <span key={chip} className="sp-chip h-[26px] cursor-default">
                            {chip}
                          </span>
                        ))}
                      </span>
                    ) : (
                      v.shortName
                    )}
                  </td>
                  <td>
                    <span className="sp-num">{durationText([v])}</span>
                  </td>
                  <td className="sp-table__num">
                    <span className="sp-num whitespace-nowrap">{priceText(v, capable)}</span>
                  </td>
                  <td className="sp-table__actions">
                    <span className="inline-flex items-center gap-1">
                      <Tip label="Nhân bản" side="bottom-end">
                        <button
                          type="button"
                          className="sp-icon-btn"
                          aria-label={`Nhân bản biến thể ${v.name}`}
                          onClick={() => ed.addVariant(v)}
                        >
                          <Copy size={16} aria-hidden="true" />
                        </button>
                      </Tip>
                      <Tip label="Xóa" side="bottom-end">
                        <button
                          type="button"
                          className="sp-icon-btn"
                          aria-label={`Xóa biến thể ${v.name}`}
                          disabled={draft.variants.length === 1}
                          onClick={() => ed.removeVariant(v.id)}
                        >
                          <Trash2 size={16} aria-hidden="true" />
                        </button>
                      </Tip>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="sp-panel shadow-[0_0_0_1px_var(--line)]!">
        <h3 className="sp-panel__title text-sm!">
          {bySubject ? `Điều kiện của “${variant.name}”` : `Tên của “${variant.name}”`}
        </h3>
        <div className="flex flex-wrap items-end gap-(--space-3)">
          <Field
            id="vr-name"
            label="Tên biến thể"
            error={variant.name.trim() ? undefined : 'Nhập tên biến thể.'}
          >
            <input
              id="vr-name"
              type="text"
              value={variant.name}
              aria-invalid={variant.name.trim() ? undefined : true}
              onChange={(e) => ed.updateCurrent((v) => ({ ...v, name: e.target.value }))}
            />
          </Field>
          <Field id="vr-short" label="Tên trên lịch">
            <input
              id="vr-short"
              type="text"
              value={variant.shortName}
              onChange={(e) => ed.updateCurrent((v) => ({ ...v, shortName: e.target.value }))}
            />
          </Field>
          {bySubject &&
            schema.map((field) => {
              if (field.type === 'enum') {
                const value = variant.match[field.key];
                return (
                  <Field key={field.key} id={`vc-${field.key}`} label={field.label}>
                    <select
                      id={`vc-${field.key}`}
                      value={typeof value === 'string' ? value : ''}
                      onChange={(e) =>
                        ed.updateCurrent((v) => setMatchEnum(v, field.key, e.target.value))
                      }
                    >
                      {field.options.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                      <option value="">Bất kỳ</option>
                    </select>
                  </Field>
                );
              }
              if (field.type === 'number') {
                const range = matchRange(variant.match[field.key]);
                const set = (patch: { min?: number | undefined; max?: number | undefined }) =>
                  ed.updateCurrent((v) =>
                    setMatchRange(v, field.key, { ...matchRange(v.match[field.key]), ...patch }),
                  );
                const parse = (text: string) => {
                  const n = Number(text.replace(',', '.'));
                  return text.trim() === '' || Number.isNaN(n) ? undefined : n;
                };
                return (
                  <div key={field.key} className="contents">
                    <Field
                      id={`vc-${field.key}-min`}
                      label={`${field.label} từ`}
                      suffix={field.unit ?? ''}
                    >
                      <input
                        id={`vc-${field.key}-min`}
                        type="text"
                        inputMode="decimal"
                        value={numberText(range.min)}
                        onChange={(e) => set({ min: parse(e.target.value) })}
                      />
                    </Field>
                    <Field
                      id={`vc-${field.key}-max`}
                      label="đến dưới"
                      optional
                      suffix={field.unit ?? ''}
                    >
                      <input
                        id={`vc-${field.key}-max`}
                        type="text"
                        inputMode="decimal"
                        placeholder="không giới hạn"
                        value={numberText(range.max)}
                        onChange={(e) => set({ max: parse(e.target.value) })}
                      />
                    </Field>
                  </div>
                );
              }
              return null;
            })}
        </div>
        {bySubject && (
          <p className="sp-panel__note">
            Các trường lấy từ &ldquo;Thông tin của {noun ?? 'khách'}&rdquo; trong gói cấu hình ngành
            (BR-71). Cân nặng đúng giá trị &ldquo;từ&rdquo; thuộc biến thể đó; &ldquo;đến
            dưới&rdquo; không tính.
          </p>
        )}
      </div>
    </section>
  );
}

/** What decides the variant, in the words of the schema: "loài và cân nặng". */
function priceWords(ed: ServiceEditor) {
  const keys = new Set(ed.draft.variants.flatMap((v) => Object.keys(v.match)));
  const labels = ed.schema.filter((f) => keys.has(f.key)).map((f) => f.label.toLowerCase());
  if (labels.length < 2) return labels[0] ?? 'thông tin';
  return `${labels.slice(0, -1).join(', ')} và ${labels.at(-1)}`;
}

/** "Thời gian và tài nguyên": timeline, segment table, cleanup per resource type. */
export function SegmentsSection({ ed }: { ed: ServiceEditor }) {
  const { variant, fixture } = ed;
  const { segments, types } = timelineOf(variant, fixture.resourceTypes);
  const noun = fixture.template.vocabulary.subject;
  const exampleStart = noun ? undefined : PREVIEW_START;
  const tableTypes = fixture.resourceTypes.map((t) => ({
    id: t.id,
    name: t.name,
    isStaff: t.isStaff,
  }));

  return (
    <section className="sp-form-section sp-form-section--stack" aria-labelledby="sv-s3">
      <StackHead
        id="sv-s3"
        title={`Thời gian và tài nguyên · ${variant.name}`}
        desc={
          noun
            ? `${capitalize(noun)} tắm ở bồn rồi sang lồng sấy: lúc sấy nhân viên rảnh; bồn được rửa ngay khi ${noun} rời bồn, rồi nhận ${noun} khác.`
            : 'Chia dịch vụ thành từng đoạn; mỗi đoạn chọn loại tài nguyên bị chiếm. Trục vẽ ví dụ hẹn lúc 09:00.'
        }
        action={
          <Button size="sm" onClick={ed.segments.add}>
            {PlusIcon}
            Thêm đoạn
          </Button>
        }
      />
      <div className="sp-panel shadow-[0_0_0_1px_var(--line)]!">
        <SegmentTimeline
          segments={segments}
          types={types}
          cleanup={variant.cleanupMinutes}
          visible={visibleRange(variant)}
          {...(exampleStart ? { exampleStart } : {})}
          selected={ed.selectedSegment}
          onSelect={ed.setSelectedSegment}
          label={`Trục thời gian của biến thể ${variant.name}${exampleStart ? ', ví dụ hẹn lúc 09:00' : ''}`}
        />
        <TimelineLegend />
      </div>
      <SegmentTable
        caption={`Các đoạn của biến thể ${variant.name}`}
        segments={variant.segments}
        types={tableTypes}
        selected={ed.selectedSegment}
        onSelect={ed.setSelectedSegment}
        errors={ed.errors}
        onPatch={ed.segments.patch}
        onMove={ed.segments.move}
        onRemove={ed.segments.remove}
      />
      {variant.segments.length > 0 && !variant.segments.some((s) => s.kind === 'work') && (
        <p className="sp-field--error m-0">
          <span className="sp-field__help">Cần ít nhất một đoạn Làm: đó là lúc khách có mặt.</span>
        </p>
      )}
      <CleanupFields ed={ed} />
    </section>
  );
}

/** "Dọn dẹp sau khi dùng": one box for each resource type that is not staff (BR-52). */
export function CleanupFields({ ed }: { ed: ServiceEditor }) {
  const { variant, fixture } = ed;
  const cleanable = fixture.resourceTypes.filter(
    (t) => !t.isStaff && variant.segments.some((s) => s.resourceTypeIds.includes(t.id)),
  );
  return (
    <fieldset className="m-0 flex flex-wrap items-start gap-x-(--space-6) gap-y-(--space-3) border-0 p-0">
      <legend className="sp-field__label pb-2">
        Dọn dẹp sau khi dùng{' '}
        <span className="sp-field__optional">
          bắt đầu ngay khi đoạn cuối dùng tài nguyên đó kết thúc
        </span>
      </legend>
      {cleanable.map((type) => {
        const error = ed.cleanupError(type.id);
        return (
          <span key={type.id} className="flex flex-col gap-1">
            <label className="sp-mins gap-2">
              <span className="min-w-24 font-medium text-(--ink)">{type.name}</span>
              <input
                type="text"
                inputMode="numeric"
                value={ed.cleanupValue(type.id)}
                aria-label={`Dọn ${type.name} sau khi dùng, phút`}
                aria-invalid={error ? true : undefined}
                onChange={(e) => ed.setCleanup(type.id, e.target.value)}
              />
              <span>phút</span>
            </label>
            {error && (
              <span className="sp-field--error">
                <span className="sp-field__help">{error}</span>
              </span>
            )}
          </span>
        );
      })}
    </fieldset>
  );
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** "Giá theo cấp": one price for everyone, or one per staff level (BR-56). */
export function PricingSection({ ed }: { ed: ServiceEditor }) {
  const { variant, fixture, staff } = ed;
  const levels = fixture.staffLevels;
  const byLevel = Boolean(variant.pricesByLevel);
  const lowest = anyPrice(variant, ed.capable);
  const topName = ed.capable.find((s) => s.level === 2)?.profile.displayName;

  return (
    <section className="sp-form-section sp-form-section--stack" aria-labelledby="sv-s4">
      <StackHead
        id="sv-s4"
        title={`Giá theo cấp · ${variant.name}`}
        desc="Cấp đặt trong hồ sơ nhân viên."
      />
      <label className="sp-switch">
        <span>
          Giá khác nhau theo cấp nhân viên
          {!byLevel && (
            <span className="sp-check__hint">
              Tắt thì mọi cấp cùng một giá {formatVnd(variant.priceVnd)}.
            </span>
          )}
        </span>
        <input
          type="checkbox"
          role="switch"
          checked={byLevel}
          onChange={(e) => ed.setByLevel(e.target.checked)}
        />
      </label>
      <div
        className="sp-table-wrap"
        tabIndex={0}
        role="region"
        aria-label={`Giá theo cấp, biến thể ${variant.name}, cuộn được`}
      >
        <table className="sp-table">
          <caption className="sp-sr-only">Giá theo cấp, biến thể {variant.name}</caption>
          <thead>
            <tr>
              <th scope="col">Cấp</th>
              <th scope="col" className="sp-table__num">
                Giá
              </th>
              <th scope="col">Người ở cấp này</th>
            </tr>
          </thead>
          <tbody>
            {byLevel ? (
              levels.map((name, i) => {
                const people = staff.filter((s) => s.level === i + 1);
                return (
                  <tr key={name}>
                    <td>
                      Cấp {i + 1} · {name}
                    </td>
                    <td className="sp-table__num">
                      <PriceBox
                        value={ed.priceValue(i)}
                        label={`Giá cấp ${name}`}
                        onChange={(text) => ed.setPrice(i, text)}
                      />
                    </td>
                    <td>
                      {people.length ? (
                        people.map((s) => s.profile.displayName).join(', ')
                      ) : (
                        <span className="sp-muted">Chưa có ai</span>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td>Mọi cấp</td>
                <td className="sp-table__num">
                  <PriceBox
                    value={ed.priceValue('flat')}
                    label="Giá cho mọi cấp"
                    onChange={(text) => ed.setPrice('flat', text)}
                  />
                </td>
                <td>{staff.map((s) => s.profile.displayName).join(', ')}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {byLevel && (
        <p className="sp-form-section__desc m-0">
          Khách chọn &ldquo;Bất kỳ ai&rdquo; trả giá cấp thấp nhất làm được dịch vụ (
          {formatVnd(lowest)}), hệ thống xếp ai cũng giữ giá đó.
          {topName &&
            ` Khách chọn đích danh ${topName} thì trả ${formatVnd(priceFor2(ed, topName))}.`}
        </p>
      )}
    </section>
  );
}

function priceFor2(ed: ServiceEditor, displayName: string) {
  const member = ed.capable.find((s) => s.profile.displayName === displayName);
  const prices = ed.variant.pricesByLevel;
  return (member && prices?.[member.level - 1]) || ed.variant.priceVnd;
}

export function PriceBox({
  value,
  label,
  onChange,
}: {
  value: string;
  label: string;
  onChange: (text: string) => void;
}) {
  return (
    <label className="sp-mins justify-end">
      <input
        type="text"
        inputMode="numeric"
        className="w-28!"
        value={value}
        aria-label={label}
        aria-invalid={value === '' ? true : undefined}
        onChange={(e) => onChange(e.target.value)}
      />
      <span>₫</span>
    </label>
  );
}

/** "Ai làm được": the people with the skill (BR-03), shared with their profiles. */
export function WhoSection({ ed }: { ed: ServiceEditor }) {
  const { staff, variant, fixture, skills } = ed;
  const byLevel = Boolean(variant.pricesByLevel);
  const upcomingFor = (resourceId: string) =>
    upcomingCount(
      fixture.appointments.filter((a) => a.items.some((i) => i.staffResourceId === resourceId)),
      new Set(ed.saved.variants.map((v) => v.id)),
    );
  return (
    <section className="sp-form-section sp-form-section--stack" aria-labelledby="sv-s5">
      <StackHead
        id="sv-s5"
        title="Ai làm được"
        desc="Chỉ người được tick mới được xếp cho dịch vụ này (BR-03). Bỏ tick thì người đó không còn được xếp, kể cả khi lễ tân xếp tay. Sửa ở đây hay trong hồ sơ nhân viên đều như nhau."
      />
      <div className="flex flex-col gap-(--space-3)">
        {staff.map((s) => {
          const on = skills.includes(s.resourceId);
          const price = byLevel ? variant.pricesByLevel?.[s.level - 1] : undefined;
          const pending = ed.saved.variants.length ? upcomingFor(s.resourceId) : 0;
          const lowest = anyPrice(variant, ed.capable);
          const hint = [
            s.profile.bookableOnline ? 'Nhận đặt online' : 'Không nhận đặt online',
            price !== undefined
              ? price === lowest
                ? formatVnd(price)
                : `trả ${formatVnd(price)} khi khách chọn ${s.profile.displayName}`
              : null,
            !on && pending > 0 && ed.saved.variants.length
              ? `còn ${pending} lịch sắp tới của ${s.profile.displayName}, cần đổi người`
              : null,
          ]
            .filter(Boolean)
            .join(' · ');
          return (
            <CheckRow
              key={s.resourceId}
              label={`${s.profile.displayName} · ${s.profile.title}`}
              hint={hint}
              checked={on}
              onChange={(checked) => ed.toggleSkill(s.resourceId, checked)}
            />
          );
        })}
      </div>
    </section>
  );
}
