'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { ErrorPage } from '@/components/mock/error-page';
import { homeOf } from '@/mock/permissions';
import { formatMoment } from '@/mock/account-mail';
import { siteHost } from '@/mock/site';
import { staffRoleOf } from '@/mock/selection';
import { MOCK_NOW } from '@/mock/time';

/** The code the sample server error shows; the real one is the `instance` of the Problem Details. */
export const SAMPLE_ERROR_CODE = '01JD3K7Q9M2P';

/** MH-10, 500: the server failed; the code goes to support (BR-79). */
export function ServerError({
  code,
  onRetry,
}: {
  code?: string | undefined;
  onRetry?: () => void;
}) {
  return (
    <ErrorPage
      title="Máy chủ đang gặp lỗi"
      lead="Thao tác vừa rồi chưa được lưu. Thử lại sau ít phút; lỗi lặp lại thì gửi mã bên dưới cho hỗ trợ."
      actions={
        <>
          {onRetry ? (
            <button type="button" className="sp-btn sp-btn--primary" onClick={onRetry}>
              Thử lại
            </button>
          ) : null}
          <Link href="/mock" className="sp-btn sp-btn--secondary no-underline">
            Về danh sách màn hình
          </Link>
        </>
      }
      note={`Mã lỗi: ${code ?? SAMPLE_ERROR_CODE} · ${formatMoment(MOCK_NOW)}`}
    />
  );
}

/** MH-10, 404 inside the admin area: shown in the frame, with the way back to the first page of the role. */
export function NotFoundInApp({ tenantSlug }: { tenantSlug: string }) {
  return (
    <Suspense fallback={null}>
      <InApp tenantSlug={tenantSlug} />
    </Suspense>
  );
}

function InApp({ tenantSlug }: { tenantSlug: string }) {
  const role = staffRoleOf(useSearchParams().get('role'));
  const home = homeOf(role);
  const query = useSearchParams().toString();
  const href = `/mock/app/${tenantSlug}${home.path ? `/${home.path}` : ''}${query ? `?${query}` : ''}`;
  return (
    <div className="sp-shell__content sp-shell__content--wide">
      <div className="mx-auto flex max-w-[460px] flex-col items-center gap-3 pt-40 text-center max-md:pt-16">
        <h1 className="m-0 text-[22px] leading-[30px] font-bold">Không tìm thấy trang</h1>
        <p className="m-0 text-[15px] leading-[22px] text-(--ink-muted)">
          Link có thể đã cũ hoặc gõ sai. Lịch hẹn, hóa đơn bị xóa cũng dẫn tới đây.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Link href={href} className="sp-btn sp-btn--primary no-underline">
            Về {home.label}
          </Link>
          <button type="button" className="sp-btn sp-btn--secondary" onClick={() => history.back()}>
            Quay lại
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * MH-10, 404 on a customer page whose shop is not there: the subdomain of the address names it
 * (T-16), the mock keeps it in the path.
 */
export function NotFoundShop() {
  const slug = usePathname().split('/')[2] ?? '';
  return (
    <ErrorPage
      title={`Chưa có cơ sở nào ở ${siteHost(slug)}`}
      lead="Kiểm lại tên tiệm trong link. Bạn là chủ tiệm và muốn có trang như vậy?"
      actions={
        <Link href="/mock/signup" className="sp-btn sp-btn--primary no-underline">
          Đăng ký cơ sở
        </Link>
      }
    />
  );
}

/** Any other address of the mock that leads nowhere. */
export function NotFoundMock() {
  return (
    <ErrorPage
      title="Không tìm thấy trang"
      lead="Link có thể đã cũ hoặc gõ sai."
      actions={
        <Link href="/mock" className="sp-btn sp-btn--primary no-underline">
          Về danh sách màn hình
        </Link>
      }
    />
  );
}
