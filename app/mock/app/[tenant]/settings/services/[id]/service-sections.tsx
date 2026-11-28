'use client';

import { ArrowDown, ArrowUp, Copy, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAppHref } from '@/components/mock/use-app-href';
import { Button } from '@/components/sapio/button';
import { CheckRow, Field, FormSection } from '@/components/sapio/form';
import { SegmentTable } from '@/components/sapio/segment-table';
import { SegmentTimeline, TimelineLegend } from '@/components/sapio/segment-timeline';
import { formatVnd } from '@/mock/format';
import { LIMITS, missingText } from '@/mock/service-settings';
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

/** A line of red text under a table or a box. */
function ErrorLine({ children }: { children: React.ReactNode }) {
  return (
    <p className="sp-field--error m-0" role="status">
      <span className="sp-field__help">{children}</span>
    </p>
  );
}

/** "Thông tin chung": name, group, text for the customer, deposit. */
export function GeneralSection({ ed }: { ed: ServiceEditor }) {
  const { draft } = ed;
  const names = [...new Set([...ed.groups, draft.group].filter((g) => g !== ''))];
  const length = (draft.description ?? '').length;
  return (
    <FormSection
      id="sv-s1"
      title="Thông tin chung"
      description="Khách thấy tên, nhóm và mô tả ở trang đặt lịch."
    >
      <Field id="sv-name" label="Tên dịch vụ" error={ed.nameError}>
        <input
          id="sv-name"
          type="text"
          maxLength={LIMITS.serviceName}
          value={draft.name}
          aria-invalid={ed.nameError ? true : undefined}
          onChange={(e) => ed.patchService({ name: e.target.value })}
        />
      </Field>
      <Field id="sv-group" label="Nhóm" help="Đổi nhóm thì dịch vụ đứng cuối nhóm mới.">
        <select
          id="sv-group"
          value={draft.group}
          aria-describedby="sv-group-help"
          onChange={(e) => ed.patchService({ group: e.target.value })}
        >
          <option value="">Không nhóm</option>
          {names.map((group) => (
            <option key={group} value={group}>
              {group}
            </option>
          ))}
        </select>
      </Field>
      <Field
        id="sv-desc"
        label="Mô tả cho khách"
        optional
        full
        area
        help={length >= 450 ? `${length}/${LIMITS.description}` : undefined}
      >
        <textarea
          id="sv-desc"
          rows={2}
          maxLength={LIMITS.description}
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

/** "Biến thể": the table, and the name of the one being edited (BR-13, BR-55, BR-94.17 to BR-94.21). */
export function VariantsSection({ ed }: { ed: ServiceEditor }) {
  const { draft, variant, problems } = ed;
  const pathname = usePathname();
  const appHref = useAppHref(ed.fixture.tenant.slug);
  const capable = ed.capable;
  const nameError = ed.variantNameError(variant);
  const shortError = ed.shortNameError(variant);

  return (
    <section className="sp-form-section sp-form-section--stack" aria-labelledby="sv-s2">
      <StackHead
        id="sv-s2"
        title="Biến thể"
        desc={`Khách tự chọn một biến thể khi đặt; mỗi biến thể có thời gian và giá riêng (BR-13).${
          ed.canAddVariant ? '' : ` Tối đa ${LIMITS.variants} biến thể.`
        }`}
        action={
          <Button size="sm" disabled={!ed.canAddVariant} onClick={() => ed.addVariant()}>
            {PlusIcon}
            Thêm biến thể
          </Button>
        }
      />
      {problems.duplicates.length > 0 && (
        <div
          className="sp-banner sp-banner--warning"
          role="status"
          style={{ borderRadius: 'var(--radius-md)' }}
        >
          <span className="sp-banner__text">
            <strong>Chưa lưu được:</strong> tên biến thể không được trùng nhau (BR-55). Đang trùng:{' '}
            {problems.duplicates.join(', ')}.
          </span>
        </div>
      )}
      {ed.missing.length > 0 && (
        <div
          className="sp-banner sp-banner--warning"
          role="status"
          style={{ borderRadius: 'var(--radius-md)' }}
        >
          <span className="sp-banner__text">
            <ul className="m-0 list-none p-0">
              {ed.missing.map((m) => (
                <li key={`${m.branchId}:${m.variantId}`}>{missingText(m)}</li>
              ))}
            </ul>
          </span>
          <Link
            href={appHref('settings/resources')}
            className="sp-btn sp-btn--secondary sp-btn--sm no-underline"
          >
            Mở Tài nguyên
          </Link>
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
              <th scope="col">Tên trên lịch</th>
              <th scope="col">Khách thấy</th>
              <th scope="col" className="sp-table__num">
                Giá
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
                  <td>{v.shortName}</td>
                  <td>
                    <span className="sp-num">{durationText([v])}</span>
                  </td>
                  <td className="sp-table__num">
                    <span className="sp-num whitespace-nowrap">
                      {priceText(v, capable, ed.branchPriceList(v.id))}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="sp-panel shadow-[0_0_0_1px_var(--line)]!">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="sp-panel__title m-0 text-sm!">Tên của “{variant.name}”</h3>
          <span className="flex flex-wrap gap-1">
            <Button
              size="sm"
              variant="ghost"
              disabled={ed.variantIndex === 0}
              onClick={() => ed.moveVariant(variant.id, -1)}
            >
              <ArrowUp size={14} aria-hidden="true" />
              Lên
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={ed.variantIndex === draft.variants.length - 1}
              onClick={() => ed.moveVariant(variant.id, 1)}
            >
              <ArrowDown size={14} aria-hidden="true" />
              Xuống
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={!ed.canAddVariant}
              onClick={() => ed.addVariant(variant)}
            >
              <Copy size={14} aria-hidden="true" />
              Nhân bản
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={draft.variants.length === 1}
              onClick={() => ed.removeVariant(variant.id)}
            >
              <Trash2 size={14} aria-hidden="true" />
              Xóa biến thể
            </Button>
          </span>
        </div>
        <div className="flex flex-wrap items-start gap-(--space-3)">
          <Field id="vr-name" label="Tên biến thể" error={nameError}>
            <input
              id="vr-name"
              type="text"
              maxLength={LIMITS.variantName}
              value={variant.name}
              aria-invalid={nameError ? true : undefined}
              onChange={(e) => ed.updateCurrent((v) => ({ ...v, name: e.target.value }))}
            />
          </Field>
          <Field id="vr-short" label="Tên trên lịch" error={shortError}>
            <input
              id="vr-short"
              type="text"
              maxLength={LIMITS.shortName}
              value={variant.shortName}
              aria-invalid={shortError ? true : undefined}
              onChange={(e) => ed.updateCurrent((v) => ({ ...v, shortName: e.target.value }))}
            />
          </Field>
        </div>
      </div>
    </section>
  );
}

/** "Thời gian và tài nguyên": timeline, segment table, cleanup per resource type. */
export function SegmentsSection({ ed }: { ed: ServiceEditor }) {
  const { variant } = ed;
  const { segments, types } = timelineOf(variant, ed.resourceTypes);
  const exampleStart = PREVIEW_START;
  const tableTypes = ed.resourceTypes.map((t) => ({
    id: t.id,
    name: t.name,
    isStaff: t.isStaff,
  }));

  return (
    <section className="sp-form-section sp-form-section--stack" aria-labelledby="sv-s3">
      <StackHead
        id="sv-s3"
        title={`Thời gian và tài nguyên · ${variant.name}`}
        desc={`Chia dịch vụ thành từng đoạn; mỗi đoạn chọn loại tài nguyên bị chiếm. Trục vẽ ví dụ hẹn lúc 09:00.${
          ed.segments.canAdd ? '' : ` Tối đa ${LIMITS.segments} đoạn.`
        }`}
        action={
          <Button size="sm" disabled={!ed.segments.canAdd} onClick={ed.segments.add}>
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
        <ErrorLine>Cần ít nhất một đoạn Làm: đó là lúc khách có mặt.</ErrorLine>
      )}
      {ed.tooLong && <ErrorLine>{ed.tooLong}</ErrorLine>}
      <CleanupFields ed={ed} />
    </section>
  );
}

/** "Dọn dẹp sau khi dùng": one box for each resource type that is not staff (BR-52, BR-94.28). */
export function CleanupFields({ ed }: { ed: ServiceEditor }) {
  const { variant } = ed;
  const cleanable = ed.resourceTypes.filter(
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

/** "Giá": the base price, the price by staff level (BR-56), and the price of each branch (BR-94.29). */
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
        title={`Giá · ${variant.name}`}
        desc="Chi nhánh không đặt giá riêng thì dùng giá gốc (BR-02). Cấp đặt trong hồ sơ nhân viên."
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
                        error={ed.priceError(i)}
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
                    error={ed.priceError('flat')}
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
      {ed.showBranchPrices && <BranchPrices ed={ed} />}
    </section>
  );
}

/** One price for each branch in use; an empty box is the base price (BR-94.29). */
function BranchPrices({ ed }: { ed: ServiceEditor }) {
  const { variant } = ed;
  return (
    <div className="flex flex-col gap-(--space-2)">
      <h3 className="sp-panel__title text-sm!">Giá riêng chi nhánh</h3>
      <div
        className="sp-table-wrap"
        tabIndex={0}
        role="region"
        aria-label={`Giá riêng chi nhánh, biến thể ${variant.name}, cuộn được`}
      >
        <table className="sp-table">
          <caption className="sp-sr-only">Giá riêng chi nhánh, biến thể {variant.name}</caption>
          <thead>
            <tr>
              <th scope="col">Chi nhánh</th>
              <th scope="col" className="sp-table__num">
                Giá
              </th>
              <th scope="col">
                <span className="sp-sr-only">Thao tác</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {ed.branches.map((branch) => {
              const value = ed.branchPriceValue(branch.id);
              return (
                <tr key={branch.id}>
                  <td>{branch.name}</td>
                  <td className="sp-table__num">
                    <PriceBox
                      value={value}
                      label={`Giá ${variant.name} ở ${branch.name}`}
                      placeholder={`Giá gốc ${formatVnd(variant.priceVnd)}`}
                      error={ed.branchPriceError(branch.id)}
                      allowEmpty
                      onChange={(text) => ed.setBranchPrice(branch.id, text)}
                    />
                  </td>
                  <td className="sp-table__actions">
                    {value !== '' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => ed.setBranchPrice(branch.id, '')}
                      >
                        Dùng giá gốc
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
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
  placeholder,
  error,
  allowEmpty = false,
}: {
  value: string;
  label: string;
  onChange: (text: string) => void;
  placeholder?: string;
  error?: string | undefined;
  /** An empty box is a choice (the branch has no price of its own), not a mistake. */
  allowEmpty?: boolean;
}) {
  const bad = Boolean(error) || (!allowEmpty && value === '');
  return (
    <span className="flex flex-col items-end gap-1">
      <label className="sp-mins justify-end">
        <input
          type="text"
          inputMode="numeric"
          className="w-28!"
          value={value}
          placeholder={placeholder}
          aria-label={label}
          aria-invalid={bad ? true : undefined}
          onChange={(e) => onChange(e.target.value)}
        />
        <span>₫</span>
      </label>
      {error && (
        <span className="sp-field--error">
          <span className="sp-field__help max-w-56 text-right">{error}</span>
        </span>
      )}
    </span>
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
