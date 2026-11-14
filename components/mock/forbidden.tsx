'use client';

import { Lock } from 'lucide-react';
import Link from 'next/link';
import { useAppHref } from '@/components/mock/use-app-href';
import { ROLE_LABEL } from '@/mock/account';
import type { StaffRoleId } from '@/mock/fixtures/types';
import { homeOf, pageTitle } from '@/mock/permissions';

/** MH-10, 403: a page outside the role, inside the frame (BR-79). */
export function Forbidden({
  tenantSlug,
  tenantName,
  role,
  path,
}: {
  tenantSlug: string;
  tenantName: string;
  role: StaffRoleId;
  path: readonly string[];
}) {
  const appHref = useAppHref(tenantSlug);
  const home = homeOf(role);
  return (
    <div className="sp-shell__content sp-shell__content--wide">
      <div className="pt-40 max-md:pt-16">
        <div className="mx-auto flex max-w-[460px] flex-col items-center gap-3 text-center">
          <span className="inline-flex size-12 items-center justify-center rounded-full bg-(--fill-tonal) text-(--ink-muted)">
            <Lock size={22} aria-hidden="true" />
          </span>
          <h1 className="m-0 text-[22px] leading-[30px] font-bold">
            {pageTitle(path) === 'trang này'
              ? 'Không có quyền xem trang này'
              : `Không có quyền xem ${pageTitle(path)}`}
          </h1>
          <p className="m-0 text-[15px] leading-[22px] text-(--ink-muted)">
            Vai trò {ROLE_LABEL[role]} của bạn ở {tenantName} không mở được trang này. Cần thì nhờ
            chủ cơ sở hoặc quản lý xem giúp, hoặc xin thêm vai trò.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Link href={appHref(home.path)} className="sp-btn sp-btn--primary no-underline">
              Về {home.label}
            </Link>
            <Link href="/mock/select-workspace" className="sp-btn sp-btn--secondary no-underline">
              Chọn cơ sở khác
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
