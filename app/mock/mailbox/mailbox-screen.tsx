'use client';

import Link from 'next/link';
import { useAccountStore } from '@/components/mock/account-store';
import { AccountTools } from '@/components/mock/account-tools';
import { AuthPage, AuthTop } from '@/components/sapio/signup-layout';
import { formatMoment } from '@/mock/account-mail';

/**
 * The emails the account pages "send": reset links, lock notices, invitations. Only in the mock;
 * the real product sends them through the outbox (BR-66).
 */
export function MailboxScreen() {
  const { mails } = useAccountStore();
  const newest = [...mails].reverse();
  return (
    <>
      <AuthPage
        maxWidth={720}
        top={
          <AuthTop>
            <Link href="/mock/login" className="text-sm font-semibold no-underline">
              Đăng nhập
            </Link>
          </AuthTop>
        }
      >
        <div>
          <h1 className="sp-auth__title">Hộp thư mẫu</h1>
          <p className="sp-auth__lead">
            Trang chỉ có trong mock: thư Sapio gửi cho nhân sự (đặt lại mật khẩu, báo khóa, lời mời)
            hiện ở đây, link trong thư bấm được.
          </p>
        </div>
        {newest.length === 0 && (
          <p className="sp-empty m-0">
            Chưa có thư nào. Thử “Quên mật khẩu” hoặc mời một nhân viên.
          </p>
        )}
        {newest.map((mail) => (
          <article
            key={mail.id}
            aria-labelledby={`${mail.id}-title`}
            className="flex flex-col gap-(--space-3) rounded-(--radius-lg) bg-(--fill-tonal) p-(--space-4)"
          >
            <dl className="m-0 flex flex-col gap-0.5 text-sm text-(--ink-muted)">
              <div className="flex gap-(--space-2)">
                <dt className="flex-none">Tới</dt>
                <dd className="m-0 break-words">{mail.to}</dd>
              </div>
              <div className="flex gap-(--space-2)">
                <dt className="flex-none">Tiêu đề</dt>
                <dd id={`${mail.id}-title`} className="m-0 font-semibold break-words text-(--ink)">
                  {mail.subject}
                </dd>
              </div>
              <div className="flex gap-(--space-2)">
                <dt className="flex-none">Lúc</dt>
                <dd className="sp-num m-0">{formatMoment(mail.at)}</dd>
              </div>
            </dl>
            <div className="flex flex-col gap-(--space-4) rounded-(--radius-md) bg-(--surface-raised) p-(--space-5) shadow-[0_0_0_1px_var(--line)]">
              <p className="m-0 text-base">{mail.lead}</p>
              {mail.rows.length > 0 && (
                <dl className="m-0 flex flex-col">
                  {mail.rows.map(([key, value]) => (
                    <div
                      key={key}
                      className="flex justify-between gap-(--space-4) border-b border-(--line) py-(--space-2) last:border-b-0"
                    >
                      <dt className="flex-none text-sm text-(--ink-muted)">{key}</dt>
                      <dd className="sp-num m-0 text-right">{value}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {mail.action && (
                <Link
                  href={mail.action.href}
                  className="sp-btn sp-btn--primary self-start no-underline"
                >
                  {mail.action.label}
                </Link>
              )}
              {mail.notes.map((note) => (
                <p key={note} className="m-0 text-sm text-(--ink-muted)">
                  {note}
                </p>
              ))}
            </div>
          </article>
        ))}
      </AuthPage>
      <AccountTools />
    </>
  );
}
