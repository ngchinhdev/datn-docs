'use client';

import { ChevronDown } from 'lucide-react';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Button } from '@/components/sapio/button';
import { Field } from '@/components/sapio/form';
import { QuantityInput } from '@/components/sapio/quantity-input';
import { SignupLayout } from '@/components/sapio/signup-layout';
import { useToast } from '@/components/sapio/toast';
import { siteHost, BASE_DOMAIN } from '@/mock/site';
import {
  COUNT_MAX,
  COUNT_MIN,
  HOUR_OPTIONS,
  TAKEN_MESSAGE,
  WEEK,
  businessErrors,
  countOf,
  hasBusinessErrors,
  industryById,
  slugFormatError,
  slugFromName,
  slugTaken,
  type SignupDraft,
} from '@/mock/signup';

type SlugCheck = 'idle' | 'checking' | 'free' | 'taken';

/** The address is checked for free 500 ms after the last keystroke, as the API call would be. */
const SLUG_CHECK_MS = 500;

function Card({
  id,
  title,
  hint,
  children,
}: {
  id: string;
  title: string;
  hint: string;
  children: ReactNode;
}) {
  return (
    <section className="sp-auth__card" aria-labelledby={id}>
      <div>
        <h2 id={id} className="m-0 text-base leading-6 font-semibold">
          {title}
        </h2>
        <p className="sp-field__help m-0 mt-0.5">{hint}</p>
      </div>
      {children}
    </section>
  );
}

function HourSelect({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <span className="sp-select">
      <select id={id} aria-label={label} value={value} onChange={(e) => onChange(e.target.value)}>
        {HOUR_OPTIONS.map((hour) => (
          <option key={hour}>{hour}</option>
        ))}
      </select>
      <ChevronDown aria-hidden="true" />
    </span>
  );
}

/** Step 4: name, address, first branch, opening hours and how many of each resource. */
export function BusinessStep({
  draft,
  update,
  onBack,
  onNext,
}: {
  draft: SignupDraft;
  update: (patch: Partial<SignupDraft>) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const toast = useToast();
  const template = industryById(draft.industry)?.template;
  const [submitted, setSubmitted] = useState(false);
  const [slugBlurred, setSlugBlurred] = useState(false);
  const [check, setCheck] = useState<SlugCheck>('idle');
  const errors = businessErrors(draft);
  const formatError = slugFormatError(draft.slug);

  useEffect(() => {
    if (slugFormatError(draft.slug)) {
      setCheck('idle');
      return;
    }
    setCheck('checking');
    const timer = setTimeout(
      () => setCheck(slugTaken(draft.slug) ? 'taken' : 'free'),
      SLUG_CHECK_MS,
    );
    return () => clearTimeout(timer);
  }, [draft.slug]);

  if (!template) return null;

  const shows = (key: 'businessName' | 'branchName' | 'phone' | 'address') =>
    submitted ? (errors[key] ?? null) : null;
  const slugError =
    (submitted || slugBlurred) && formatError
      ? formatError
      : check === 'taken'
        ? TAKEN_MESSAGE
        : submitted
          ? (errors.slug ?? null)
          : null;
  const slugHelp =
    check === 'free'
      ? `${siteHost(draft.slug)} còn trống`
      : check === 'checking'
        ? 'Đang kiểm tra địa chỉ…'
        : 'Chữ thường không dấu, số và dấu gạch ngang; 3 đến 40 ký tự.';

  function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (hasBusinessErrors(errors)) {
      const first = [
        ['businessName', 'bz-name'],
        ['slug', 'bz-slug'],
        ['branchName', 'bz-branch'],
        ['phone', 'bz-phone'],
        ['address', 'bz-addr'],
      ].find(([key]) => errors[key as keyof typeof errors]);
      document.getElementById(first?.[1] ?? 'bz-hours')?.focus();
      return;
    }
    update({ created: true });
    onNext();
  }

  return (
    <SignupLayout
      current={4}
      title="Thông tin cơ sở"
      lead={`${template.name} · đổi ngành ở bước trước nếu chọn nhầm.`}
      maxWidth={720}
      top={
        <button
          type="button"
          className="sp-btn sp-btn--ghost sp-btn--sm"
          onClick={() =>
            toast({ text: 'Đã lưu. Đăng nhập lại để làm tiếp (mock chưa có đăng nhập).' })
          }
        >
          <span className="max-md:hidden">Lưu và làm tiếp sau</span>
          <span className="md:hidden">Lưu, làm sau</span>
        </button>
      }
      actions={
        <>
          <Button variant="secondary" onClick={onBack}>
            Quay lại
          </Button>
          <Button type="submit" form="signup-business" variant="primary">
            Tạo cơ sở
          </Button>
        </>
      }
    >
      <form id="signup-business" noValidate onSubmit={submit} className="contents">
        <Card
          id="bz-address"
          title="Tên và địa chỉ trang đặt lịch"
          hint="Khách vào địa chỉ này để đặt lịch. Đổi được sau trong Cài đặt › Thương hiệu, địa chỉ cũ tự chuyển sang địa chỉ mới."
        >
          <Field id="bz-name" label="Tên cơ sở" size="md" error={shows('businessName')}>
            <input
              id="bz-name"
              type="text"
              placeholder="Ví dụ: Salon Tóc Mây"
              autoComplete="organization"
              value={draft.businessName}
              aria-invalid={shows('businessName') ? true : undefined}
              aria-describedby={shows('businessName') ? 'bz-name-help' : undefined}
              onChange={(e) =>
                update({
                  businessName: e.target.value,
                  ...(draft.slugEdited ? {} : { slug: slugFromName(e.target.value) }),
                })
              }
            />
          </Field>
          <Field
            id="bz-slug"
            label="Địa chỉ trang đặt lịch"
            size="md"
            suffix={`.${BASE_DOMAIN}`}
            error={slugError}
            ok={check === 'free' && !slugError}
            help={slugHelp}
            live
          >
            <input
              id="bz-slug"
              value={draft.slug}
              placeholder="toc-may"
              autoCapitalize="none"
              autoComplete="off"
              spellCheck={false}
              aria-invalid={slugError ? true : undefined}
              aria-describedby="bz-slug-help"
              onChange={(e) =>
                update({ slug: e.target.value.toLowerCase(), slugEdited: e.target.value !== '' })
              }
              onBlur={() => setSlugBlurred(true)}
            />
          </Field>
        </Card>

        <Card
          id="bz-branch-card"
          title="Chi nhánh đầu tiên"
          hint="Thêm chi nhánh khác sau trong Cài đặt."
        >
          <div className="grid grid-cols-1 gap-(--space-4) min-[560px]:grid-cols-2">
            <Field id="bz-branch" label="Tên chi nhánh" size="md" error={shows('branchName')}>
              <input
                id="bz-branch"
                type="text"
                placeholder="Ví dụ: Quận 3"
                value={draft.branchName}
                aria-invalid={shows('branchName') ? true : undefined}
                aria-describedby={shows('branchName') ? 'bz-branch-help' : undefined}
                onChange={(e) => update({ branchName: e.target.value })}
              />
            </Field>
            <Field id="bz-phone" label="Số điện thoại" size="md" error={shows('phone')}>
              <input
                id="bz-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="Ví dụ: 028 3930 1234"
                value={draft.phone}
                aria-invalid={shows('phone') ? true : undefined}
                aria-describedby={shows('phone') ? 'bz-phone-help' : undefined}
                onChange={(e) => update({ phone: e.target.value })}
              />
            </Field>
          </div>
          <Field id="bz-addr" label="Địa chỉ" size="md" error={shows('address')}>
            <input
              id="bz-addr"
              type="text"
              autoComplete="street-address"
              placeholder="Số nhà, đường, phường, thành phố"
              value={draft.address}
              aria-invalid={shows('address') ? true : undefined}
              aria-describedby={shows('address') ? 'bz-addr-help' : undefined}
              onChange={(e) => update({ address: e.target.value })}
            />
          </Field>
        </Card>

        <Card
          id="bz-hours"
          title="Giờ mở cửa"
          hint="Giờ Việt Nam. Nghỉ trưa, nhiều khung một ngày và ngày lễ chỉnh trong Cài đặt › Chi nhánh."
        >
          <div className="flex flex-col gap-1">
            {WEEK.map(({ label }, i) => {
              const day = draft.hours[i]!;
              const patch = (next: Partial<typeof day>) =>
                update({ hours: draft.hours.map((d, j) => (j === i ? { ...d, ...next } : d)) });
              const rowError = errors.days[i];
              return (
                <div key={label} className="flex flex-col">
                  <div className="grid min-h-10 grid-cols-[72px_48px_minmax(0,1fr)] items-center gap-(--space-2) min-[560px]:grid-cols-[110px_56px_minmax(0,1fr)] min-[560px]:gap-(--space-3)">
                    <span className="text-sm leading-5 font-medium">{label}</span>
                    <label className="sp-switch justify-start!">
                      <span className="sp-sr-only">Mở cửa {label}</span>
                      <input
                        type="checkbox"
                        role="switch"
                        checked={day.open}
                        onChange={(e) => patch({ open: e.target.checked })}
                      />
                    </label>
                    {day.open ? (
                      <span className="flex items-center gap-(--space-2)">
                        <HourSelect
                          id={`bz-h${i}a`}
                          label={`${label}, mở cửa lúc`}
                          value={day.from}
                          onChange={(from) => patch({ from })}
                        />
                        <span aria-hidden="true" className="text-(--ink-muted)">
                          –
                        </span>
                        <HourSelect
                          id={`bz-h${i}b`}
                          label={`${label}, đóng cửa lúc`}
                          value={day.to}
                          onChange={(to) => patch({ to })}
                        />
                      </span>
                    ) : (
                      <span className="text-sm leading-5 text-(--ink-muted)">Nghỉ</span>
                    )}
                  </div>
                  {rowError && submitted && (
                    <span className="sp-field__help ps-[calc(110px+56px+2*var(--space-3))] text-(--danger)">
                      {rowError}
                    </span>
                  )}
                </div>
              );
            })}
            {errors.hours && submitted && (
              <span className="sp-field__help text-(--danger)" role="alert">
                {errors.hours}
              </span>
            )}
          </div>
        </Card>

        <Card
          id="bz-resources"
          title="Tài nguyên ban đầu"
          hint="Số lượng ở chi nhánh này. Đặt tên từng cái sau trong Cài đặt › Tài nguyên."
        >
          {template.resourceTypes.map((type, i) => (
            <div key={type.name} className="flex items-center justify-between gap-(--space-3)">
              <span className="flex flex-col">
                <label htmlFor={`bz-res-${i}`} className="text-sm leading-5 font-medium">
                  {type.name}
                </label>
                <span className="sp-field__help">{type.hint}</span>
              </span>
              <QuantityInput
                id={`bz-res-${i}`}
                noun={type.name.toLowerCase()}
                value={countOf(draft, type.name, type.defaultCount)}
                min={COUNT_MIN}
                max={COUNT_MAX}
                onChange={(value) => update({ counts: { ...draft.counts, [type.name]: value } })}
              />
            </div>
          ))}
        </Card>
      </form>
    </SignupLayout>
  );
}
