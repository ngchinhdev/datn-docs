'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type DragEvent, type FormEvent } from 'react';
import { useScheduleStore } from '@/components/mock/schedule-store';
import { useAppHref } from '@/components/mock/use-app-href';
import { useDesk } from '@/components/mock/use-desk';
import { Button } from '@/components/sapio/button';
import { ConfirmDialog } from '@/components/sapio/confirm-dialog';
import { Field, Form, SaveBar } from '@/components/sapio/form';
import { PageHeader } from '@/components/sapio/page-header';
import { useToast } from '@/components/sapio/toast';
import { useUnsavedGuard } from '@/components/sapio/use-unsaved-guard';
import { cn } from '@/lib/utils';
import { tenantFixtures } from '@/mock/fixtures';
import { slugFormatError } from '@/mock/signup';
import { BASE_DOMAIN, siteHost } from '@/mock/site';
import {
  accentProblem,
  accentStyle,
  ACCENT_SUGGESTIONS,
  contrastText,
  isHexColor,
  REDIRECT_DAYS,
  whiteContrast,
} from '@/mock/shop';
import { addDays, formatFullDate, MOCK_TODAY } from '@/mock/time';

const MAX_LOGO_BYTES = 2 * 1024 * 1024;

/** `b4235a` and `#b4235a` both become `#B4235A`. */
const normalizeHex = (text: string) => {
  const t = text.trim();
  const withHash = /^[0-9a-f]{6}$/i.test(t) ? `#${t}` : t;
  return isHexColor(withHash) ? withHash.toUpperCase() : t;
};

/** Thương hiệu (MH-50): logo, accent colour (BR-65), the address of the booking page, with a preview. */
export function BrandingScreen({ tenantSlug }: { tenantSlug: string }) {
  const router = useRouter();
  const appHref = useAppHref(tenantSlug);
  const toast = useToast();
  const { fixture, ctx } = useDesk(tenantSlug);
  const { config, saveSettings } = useScheduleStore();
  const saved = config.branding;
  const ownSlug = fixture.tenant.slug;

  const [accent, setAccent] = useState(saved.accent);
  const [slug, setSlug] = useState(saved.slug);
  const [logoName, setLogoName] = useState(saved.logoName ?? '');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [leaveHref, setLeaveHref] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const picker = useRef<HTMLInputElement>(null);

  // A picture chosen in the browser is shown from memory; it is never sent anywhere.
  useEffect(
    () => () => {
      if (logoUrl) URL.revokeObjectURL(logoUrl);
    },
    [logoUrl],
  );

  const accentError = accentProblem(accent);
  const slugError = slugFormatError(slug);
  const taken =
    slug !== saved.slug &&
    tenantFixtures.some((f) => f.tenant.slug === slug && f.tenant.slug !== ownSlug);
  const slugProblem = slugError ?? (taken ? 'Địa chỉ này đã có cơ sở khác dùng.' : null);

  const changes = [
    ...(accent.toUpperCase() !== saved.accent.toUpperCase()
      ? [
          {
            short: 'màu nhấn',
            detail: `${saved.accent.toUpperCase()} → ${accent.toUpperCase()}`,
          },
        ]
      : []),
    ...(slug !== saved.slug
      ? [
          {
            short: 'đường dẫn',
            detail: `${siteHost(saved.slug)} → ${siteHost(slug)} (link cũ chuyển hướng ${REDIRECT_DAYS} ngày)`,
          },
        ]
      : []),
    ...(logoName !== (saved.logoName ?? '')
      ? [{ short: 'logo', detail: logoName ? `Chọn tệp ${logoName}` : 'Bỏ logo' }]
      : []),
  ];
  const invalid = accentError !== null || slugProblem !== null;
  useUnsavedGuard(changes.length > 0, setLeaveHref);

  function take(file: File | undefined) {
    if (!file) return;
    if (!/^image\//.test(file.type)) return setLogoError('Chọn một tệp ảnh (JPG hoặc PNG).');
    if (file.size > MAX_LOGO_BYTES) return setLogoError('Ảnh lớn hơn 2 MB, chọn ảnh nhỏ hơn.');
    setLogoError(null);
    setLogoName(file.name);
    setLogoUrl(URL.createObjectURL(file));
  }
  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    take(e.dataTransfer.files[0]);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (invalid) return;
    const now = ctx();
    const slugChanged = slug !== saved.slug;
    saveSettings(
      {
        config: {
          branding: {
            accent: accent.toUpperCase(),
            slug,
            ...(logoName ? { logoName } : {}),
            ...(slugChanged
              ? {
                  previousSlug: saved.slug,
                  redirectUntil: addDays(MOCK_TODAY, REDIRECT_DAYS),
                }
              : {
                  ...(saved.previousSlug ? { previousSlug: saved.previousSlug } : {}),
                  ...(saved.redirectUntil ? { redirectUntil: saved.redirectUntil } : {}),
                }),
          },
        },
      },
      {
        at: now.now,
        actor: { name: now.actor, role: now.role },
        entries: changes.map((c) => ({
          action: 'Sửa thương hiệu',
          object: c.short.charAt(0).toUpperCase() + c.short.slice(1),
          href: 'settings/branding',
          detail: c.detail,
        })),
      },
    );
    toast({
      text: slugChanged
        ? `Đã lưu. Link cũ ${siteHost(saved.slug)} chuyển hướng ${REDIRECT_DAYS} ngày. Trang khách đổi màu ngay.`
        : 'Đã lưu. Trang khách đổi màu ngay.',
    });
  }

  function discard() {
    setAccent(saved.accent);
    setSlug(saved.slug);
    setLogoName(saved.logoName ?? '');
    setLogoUrl(null);
    setLogoError(null);
  }

  const shown = accentError ? saved.accent : accent;
  const ratio = isHexColor(accent) ? whiteContrast(accent) : null;
  const redirectNote =
    saved.previousSlug && saved.redirectUntil
      ? `Link cũ ${siteHost(saved.previousSlug)} chuyển hướng tới đây đến ${formatFullDate(saved.redirectUntil)}.`
      : null;

  return (
    <>
      <PageHeader
        crumbs={[{ label: 'Cài đặt', href: appHref('settings') }, { label: 'Thương hiệu' }]}
        title="Thương hiệu và trang đặt lịch"
        sub={`Khách thấy những thứ này ở ${siteHost(saved.slug)}`}
      />
      <div className="flex flex-wrap items-start gap-6">
        <Form onSubmit={onSubmit} className="min-w-0 flex-[1_1_420px] gap-5">
          <section className="sp-panel" aria-labelledby="br-1">
            <h2 className="sp-panel__title" id="br-1">
              Ảnh
            </h2>
            <div className="sp-field sp-field--sm">
              <span className="sp-field__label" id="br-l">
                Logo
              </span>
              <div
                role="group"
                aria-labelledby="br-l"
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                className={cn(
                  'flex items-center gap-3 rounded-(--radius-md) bg-(--surface) p-4 shadow-[inset_0_0_0_1px_var(--line)]',
                  dragging && 'shadow-[inset_0_0_0_2px_var(--brand)]',
                )}
              >
                {logoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoUrl}
                    alt="Logo đã chọn"
                    className="size-12 rounded-md object-cover"
                  />
                )}
                <span className="flex-auto text-sm leading-5">
                  {logoName ? (
                    <>
                      Đã chọn <strong>{logoName}</strong>.{' '}
                    </>
                  ) : (
                    'Kéo ảnh vào đây hoặc '
                  )}
                  <button
                    type="button"
                    className="cursor-pointer border-0 bg-transparent p-0 font-medium text-(--brand) underline"
                    onClick={() => picker.current?.click()}
                  >
                    {logoName ? 'chọn tệp khác' : 'chọn tệp'}
                  </button>
                </span>
                {logoName && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setLogoName('');
                      setLogoUrl(null);
                    }}
                  >
                    Bỏ
                  </Button>
                )}
                <input
                  ref={picker}
                  type="file"
                  accept="image/*"
                  className="sp-sr-only"
                  aria-label="Chọn tệp logo"
                  onChange={(e) => {
                    take(e.target.files?.[0]);
                    e.target.value = '';
                  }}
                />
              </div>
              <span className={cn('sp-field__help', logoError && 'text-(--danger)')}>
                {logoError ??
                  'JPG hoặc PNG, dưới 2 MB. Chỉ xem trước trong trình duyệt, không tải lên đâu.'}
              </span>
            </div>
          </section>

          <section className="sp-panel" aria-labelledby="br-2">
            <h2 className="sp-panel__title" id="br-2">
              Màu nhấn
            </h2>
            <div role="group" aria-label="Màu gợi ý" className="flex items-center gap-[10px]">
              {ACCENT_SUGGESTIONS.map((c) => {
                const on = accent.toUpperCase() === c.hex;
                return (
                  <button
                    key={c.hex}
                    type="button"
                    aria-label={`Màu ${c.name}`}
                    aria-pressed={on}
                    className="size-8 cursor-pointer rounded-full border-0"
                    style={{
                      background: c.hex,
                      boxShadow: on
                        ? '0 0 0 3px var(--surface-raised), 0 0 0 5px var(--brand)'
                        : '0 0 0 1px var(--line)',
                    }}
                    onClick={() => setAccent(c.hex)}
                  />
                );
              })}
            </div>
            <div className="w-40">
              <Field
                id="br-hex"
                label="Mã màu"
                error={
                  accent !== saved.accent && isHexColor(accent) === false ? accentError : undefined
                }
              >
                <input
                  id="br-hex"
                  value={accent}
                  spellCheck={false}
                  aria-invalid={accentError ? true : undefined}
                  onChange={(e) => setAccent(normalizeHex(e.target.value))}
                />
              </Field>
            </div>
            {ratio !== null && (
              <p role="status" className={cn('sp-fit', accentError ? 'sp-fit--bad' : 'sp-fit--ok')}>
                <span>
                  {accentError ??
                    `Chữ trắng trên màu này ${contrastText(ratio)}, đạt mức 4,5 : 1. Màu nhạt tự sinh cho nền ô chọn.`}
                </span>
              </p>
            )}
            <p className="sp-panel__note">
              Màu nhấn dùng cho nút chính, ô giờ đang chọn và link trên trang khách. Khu quản trị
              giữ màu Sapio (BR-65).
            </p>
          </section>

          <section className="sp-panel" aria-labelledby="br-3">
            <h2 className="sp-panel__title" id="br-3">
              Địa chỉ trang đặt lịch
            </h2>
            <Field
              id="br-s"
              label="Tên miền"
              suffix={`.${BASE_DOMAIN}`}
              help={`Chữ thường, số, gạch ngang. Đổi đường dẫn thì link cũ chuyển hướng ${REDIRECT_DAYS} ngày.`}
              error={slugProblem}
            >
              <input
                id="br-s"
                value={slug}
                spellCheck={false}
                aria-invalid={slugProblem ? true : undefined}
                onChange={(e) => setSlug(e.target.value.toLowerCase())}
              />
            </Field>
            {!slugProblem && (
              <p role="status" className="sp-fit sp-fit--ok">
                <span>
                  {slug === saved.slug
                    ? `${siteHost(slug)} đang là của bạn.`
                    : `${siteHost(slug)} còn trống. Lưu thì link cũ ${siteHost(saved.slug)} chuyển hướng ${REDIRECT_DAYS} ngày.`}
                </span>
              </p>
            )}
            {redirectNote && <p className="sp-panel__note">{redirectNote}</p>}
          </section>

          <SaveBar
            count={changes.length}
            summary={
              <>
                Chưa lưu: {changes.length === 1 ? '1 thay đổi' : `${changes.length} thay đổi`} (
                {changes.map((c) => c.short).join(', ')})
              </>
            }
            saveDisabled={invalid}
            note={invalid ? 'Sửa chỗ báo lỗi để lưu' : undefined}
            onDiscard={discard}
          />
        </Form>

        <div className="sticky top-0 flex flex-none flex-col gap-2">
          <span className="text-[13px] leading-[18px] font-semibold text-(--ink-muted)">
            Xem trước trang cơ sở
          </span>
          <div
            className={cn(
              `sp-tenant-${fixture.tenant.id}`,
              'w-[300px] overflow-hidden rounded-2xl bg-(--surface) shadow-[0_0_0_1px_var(--line),var(--shadow-card)]',
            )}
            style={accentStyle(fixture.tenant.id, shown)}
          >
            <div className="flex h-[90px] items-end bg-[linear-gradient(135deg,var(--accent-soft),var(--fill-tonal))] p-3">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="" className="size-11 rounded-xl object-cover" />
              ) : (
                <span className="flex size-11 items-center justify-center rounded-xl bg-(--accent-soft) text-lg font-semibold text-(--accent)">
                  {fixture.tenant.monogram}
                </span>
              )}
            </div>
            <div className="flex flex-col gap-[6px] px-[14px] py-3">
              <strong className="text-lg">{fixture.tenant.name}</strong>
              <span className="text-[13px] text-(--ink-muted)">
                {fixture.template.cardDescription}
              </span>
              <div className="sp-slots mt-[6px] grid-cols-3">
                {['14:00', '14:15', '15:00'].map((t, i) => (
                  <button
                    key={t}
                    type="button"
                    className="sp-slot"
                    aria-pressed={i === 0}
                    tabIndex={-1}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <button type="button" className="sp-btn sp-btn--accent mt-2" tabIndex={-1}>
                Đặt lịch
              </button>
            </div>
          </div>
        </div>
      </div>
      <ConfirmDialog
        open={leaveHref !== null}
        title="Rời trang này?"
        body={`Còn ${changes.length} thay đổi chưa lưu. Rời đi thì ${
          changes.length === 1 ? 'thay đổi đó' : 'các thay đổi đó'
        } mất.`}
        confirmLabel="Rời trang"
        tone="danger"
        onClose={() => setLeaveHref(null)}
        onConfirm={() => {
          const href = leaveHref;
          setLeaveHref(null);
          if (href) router.push(href);
        }}
      />
    </>
  );
}
