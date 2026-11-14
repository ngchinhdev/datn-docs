'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAccountStore } from '@/components/mock/account-store';
import { Button } from '@/components/sapio/button';
import { AuthPage, AuthTop } from '@/components/sapio/signup-layout';
import { formatMoment } from '@/mock/account-mail';
import type { Workspace } from '@/mock/fixtures/accounts';
import { initialsOfName } from '@/mock/people-format';

/** Reason shown to the owner when the mock locks a tenant (BR-75). */
export const SAMPLE_LOCK_REASON = 'Nhiều khách báo bị thu cọc nhưng không có lịch';

/**
 * MH-10, a locked tenant, admin area: the owner sees why and since when, staff see the same page
 * without the reason. A lock does not depend on the plan, so there is nothing to renew (BR-75).
 */
export function LockedWorkspace({
  workspace,
  isOwner,
  personName,
}: {
  workspace: Workspace;
  isOwner: boolean;
  personName: string;
}) {
  const router = useRouter();
  const { locks, patch } = useAccountStore();
  const lock = locks[workspace.id];

  return (
    <AuthPage
      maxWidth={560}
      top={
        <AuthTop>
          <span className="flex items-center gap-2 text-sm font-medium">
            <span className="sp-avatar sp-avatar--sm">{initialsOfName(personName)}</span>
            {personName}
          </span>
        </AuthTop>
      }
    >
      <div className="flex items-center gap-3 pt-(--space-8)">
        <span
          className={`sp-switcher__mark sp-tenant-${workspace.tone}`}
          aria-hidden="true"
          style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
        >
          {workspace.monogram}
        </span>
        <span className="text-[15px] leading-[22px] font-semibold">{workspace.name}</span>
      </div>
      <div>
        <h1 className="sp-auth__title">Cơ sở đang bị khóa</h1>
        <p className="sp-auth__lead">
          {isOwner && lock
            ? `Quản trị Sapio khóa cơ sở này lúc ${formatMoment(lock.at)}.`
            : 'Quản trị Sapio đã khóa cơ sở này.'}{' '}
          Khu nội bộ và trang đặt lịch đều dừng; dữ liệu giữ nguyên.
        </p>
      </div>
      <section className="sp-auth__card gap-3!" aria-label="Chi tiết khóa">
        <dl className="sp-kv m-0">
          {isOwner && lock && (
            <>
              <dt>Lý do</dt>
              <dd>{lock.reason}</dd>
            </>
          )}
          <dt>Khách đã đặt</dt>
          <dd>Vẫn xem và hủy được lịch của mình</dd>
          <dt>Liên hệ</dt>
          <dd>
            <a href="mailto:hotro@sapio.vn">hotro@sapio.vn</a>
          </dd>
        </dl>
      </section>
      <div className="sp-auth__actions justify-start!">
        <Link href="/mock/select-workspace" className="sp-btn sp-btn--secondary no-underline">
          Chọn cơ sở khác
        </Link>
        <Button
          variant="ghost"
          onClick={() => {
            patch(() => ({ session: null }));
            router.push('/mock/login');
          }}
        >
          Đăng xuất
        </Button>
      </div>
      <p className="m-0 text-[13px] leading-[18px] text-(--ink-muted)">
        Khóa không phụ thuộc gói: gia hạn không mở được (BR-75).
      </p>
      <aside
        aria-label="Công cụ mock"
        className="flex items-center gap-2 border-t border-(--line) pt-(--space-3) text-sm"
      >
        <span className="text-(--ink-muted)">Mock:</span>
        <Button
          size="sm"
          onClick={() =>
            patch((d) => {
              const { [workspace.id]: _opened, ...rest } = d.locks;
              return { locks: rest };
            })
          }
        >
          Mở khóa cơ sở
        </Button>
      </aside>
    </AuthPage>
  );
}
