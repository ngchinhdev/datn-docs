'use client';

import { ChevronDown } from 'lucide-react';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { useAuthText } from '@/components/mock/auth-text';
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
  WEEK,
  businessErrors,
  countOf,
  hasBusinessErrors,
  industryById,
  SIGNUP_INDUSTRY,
  slugFormatError,
  slugFromName,
  slugTaken,
  type SignupDraft,
  placedResourceTypes,
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
  const { lang, t } = useAuthText();
  const text = t.signup.business;
  const template = industryById(SIGNUP_INDUSTRY)?.template;
  const [submitted, setSubmitted] = useState(false);
  const [slugBlurred, setSlugBlurred] = useState(false);
  const [check, setCheck] = useState<SlugCheck>('idle');
  const errors = businessErrors(draft, lang);
  const formatError = slugFormatError(draft.slug, lang);

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
        ? t.errors.slugTaken
        : submitted
          ? (errors.slug ?? null)
          : null;
  const slugHelp =
    check === 'free'
      ? text.slugFree(siteHost(draft.slug))
      : check === 'checking'
        ? text.slugChecking
        : text.slugRule;

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
      current={3}
      title={text.title}
      lead={text.lead}
      maxWidth={720}
      top={
        <button
          type="button"
          className="sp-btn sp-btn--ghost sp-btn--sm"
          onClick={() => toast({ text: text.saved })}
        >
          <span className="max-md:hidden">{text.saveLater}</span>
          <span className="md:hidden">{text.saveLaterShort}</span>
        </button>
      }
      actions={
        <>
          <Button variant="secondary" onClick={onBack}>
            {t.common.back}
          </Button>
          <Button type="submit" form="signup-business" variant="primary">
            {text.create}
          </Button>
        </>
      }
    >
      <form id="signup-business" noValidate onSubmit={submit} className="contents">
        <Card id="bz-address" title={text.addressTitle} hint={text.addressHint}>
          <Field id="bz-name" label={text.name} size="md" error={shows('businessName')}>
            <input
              id="bz-name"
              type="text"
              placeholder={text.namePlaceholder}
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
            label={text.slug}
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

        <Card id="bz-branch-card" title={text.branchTitle} hint={text.branchHint}>
          <div className="grid grid-cols-1 gap-(--space-4) min-[560px]:grid-cols-2">
            <Field id="bz-branch" label={text.branch} size="md" error={shows('branchName')}>
              <input
                id="bz-branch"
                type="text"
                placeholder={text.branchPlaceholder}
                value={draft.branchName}
                aria-invalid={shows('branchName') ? true : undefined}
                aria-describedby={shows('branchName') ? 'bz-branch-help' : undefined}
                onChange={(e) => update({ branchName: e.target.value })}
              />
            </Field>
            <Field id="bz-phone" label={text.phone} size="md" error={shows('phone')}>
              <input
                id="bz-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder={text.phonePlaceholder}
                value={draft.phone}
                aria-invalid={shows('phone') ? true : undefined}
                aria-describedby={shows('phone') ? 'bz-phone-help' : undefined}
                onChange={(e) => update({ phone: e.target.value })}
              />
            </Field>
          </div>
          <Field id="bz-addr" label={text.address} size="md" error={shows('address')}>
            <input
              id="bz-addr"
              type="text"
              autoComplete="street-address"
              placeholder={text.addressPlaceholder}
              value={draft.address}
              aria-invalid={shows('address') ? true : undefined}
              aria-describedby={shows('address') ? 'bz-addr-help' : undefined}
              onChange={(e) => update({ address: e.target.value })}
            />
          </Field>
        </Card>

        <Card id="bz-hours" title={text.hoursTitle} hint={text.hoursHint}>
          <div className="flex flex-col gap-1">
            {WEEK.map(({ label: viLabel }, i) => {
              const label = text.weekdays[i] ?? viLabel;
              const day = draft.hours[i]!;
              const patch = (next: Partial<typeof day>) =>
                update({ hours: draft.hours.map((d, j) => (j === i ? { ...d, ...next } : d)) });
              const rowError = errors.days[i];
              return (
                <div key={label} className="flex flex-col">
                  <div className="grid min-h-10 grid-cols-[72px_48px_minmax(0,1fr)] items-center gap-(--space-2) min-[560px]:grid-cols-[110px_56px_minmax(0,1fr)] min-[560px]:gap-(--space-3)">
                    <span className="text-sm leading-5 font-medium">{label}</span>
                    <label className="sp-switch justify-start!">
                      <span className="sp-sr-only">{text.openOn(label)}</span>
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
                          label={text.opensAt(label)}
                          value={day.from}
                          onChange={(from) => patch({ from })}
                        />
                        <span aria-hidden="true" className="text-(--ink-muted)">
                          –
                        </span>
                        <HourSelect
                          id={`bz-h${i}b`}
                          label={text.closesAt(label)}
                          value={day.to}
                          onChange={(to) => patch({ to })}
                        />
                      </span>
                    ) : (
                      <span className="text-sm leading-5 text-(--ink-muted)">{text.closed}</span>
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

        <Card id="bz-resources" title={text.resourcesTitle} hint={text.resourcesHint}>
          {placedResourceTypes(template).map((type, i) => (
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
