'use client';

import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { useAccountStore } from '@/components/mock/account-store';
import { AccountTools } from '@/components/mock/account-tools';
import { useInvitations } from '@/components/mock/use-invitations';
import { Button } from '@/components/sapio/button';
import { AuthPage, AuthTop } from '@/components/sapio/signup-layout';
import { useToast } from '@/components/sapio/toast';
import {
  branchLabel,
  doorEntry,
  doorsOf,
  entryHref,
  pendingInvitationsFor,
  ROLE_LABEL,
  type DoorEntry,
} from '@/mock/account';
import { workspaces } from '@/mock/fixtures/accounts';
import { initialsOfName } from '@/mock/people-format';
import { localDate } from '@/mock/time';

const NOTE: Record<DoorEntry, string | null> = {
  open: null,
  plan: 'Gói hết hạn, chỉ vào được trang Gói Sapio',
  locked: 'Bị Sapio khóa',
  paused: 'Gói hết hạn, chờ chủ cơ sở gia hạn',
};

/** MH-06: the tenants of the signed-in account, and the invitations waiting for it (BR-79). */
export function SelectScreen() {
  const router = useRouter();
  const toast = useToast();
  const { now, members, invitations, signedIn, lastWorkspace, patch } = useAccountStore();
  const { accept, decline } = useInvitations();

  useEffect(() => {
    if (!signedIn) router.replace('/mock/login');
  }, [signedIn, router]);
  if (!signedIn) return null;

  const doors = doorsOf(signedIn.id, members, workspaces);
  const last = lastWorkspace[signedIn.id];
  const waiting = pendingInvitationsFor(invitations, signedIn.email, now);

  function take(token: string, name: string) {
    const result = accept(token, { fullName: '', password: '' });
    if (!result.ok) return;
    toast({ text: `Đã nhận lời mời vào ${name}.` });
  }

  return (
    <>
      <AuthPage
        maxWidth={560}
        top={
          <AuthTop>
            <span className="flex items-center gap-2 text-sm font-medium">
              <span className="sp-avatar sp-avatar--sm">{initialsOfName(signedIn.fullName)}</span>
              {signedIn.fullName}
            </span>
          </AuthTop>
        }
      >
        <div>
          <h1 className="sp-auth__title">Chọn cơ sở</h1>
          <p className="sp-auth__lead">
            Tài khoản {signedIn.email} làm ở {doors.length} cơ sở. Mỗi cơ sở mở ở tab riêng cũng
            được.
          </p>
        </div>
        <ul className="m-0 flex list-none flex-col gap-2 p-0" aria-label="Cơ sở của bạn">
          {doors.map((door) => {
            const workspace = workspaces.find((w) => w.id === door.workspaceId)!;
            const member = members.find(
              (m) => m.accountId === signedIn.id && m.workspaceId === workspace.id,
            )!;
            const entry = doorEntry(door.role, door.status);
            const href = entryHref(workspace, member, entry);
            const note = NOTE[entry] ?? (workspace.built ? null : 'Cơ sở mẫu, chưa có giao diện');
            const sub = [
              ROLE_LABEL[member.role],
              member.branchId ? `Chi nhánh ${branchLabel(member.branchId)}` : null,
            ]
              .filter(Boolean)
              .join(' · ');
            const body: ReactNode = (
              <>
                <span
                  className={`sp-switcher__mark sp-tenant-${workspace.tone}`}
                  aria-hidden="true"
                  style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
                >
                  {workspace.monogram}
                </span>
                <span className="min-w-0">
                  <span className="flex items-center text-[15px] leading-[22px] font-semibold">
                    {workspace.name}
                    {workspace.id === last && (
                      <span className="sp-badge sp-badge--completed ms-2">Dùng gần nhất</span>
                    )}
                  </span>
                  <span className="block text-[13px] leading-[18px] text-(--ink-muted)">{sub}</span>
                </span>
                {entry === 'paused' ? (
                  <span className="ms-auto flex items-center gap-2">
                    <span className="sp-badge sp-badge--no-show">Tạm dừng</span>
                    <span className="text-[13px] leading-[18px] text-(--ink-muted)">{note}</span>
                  </span>
                ) : (
                  <span className="ms-auto flex items-center gap-2 text-(--ink-muted)">
                    {note && <span className="text-[13px] leading-[18px]">{note}</span>}
                    {href && <ArrowRight size={18} aria-hidden="true" />}
                  </span>
                )}
              </>
            );
            const className =
              'sp-choice flex flex-row items-center justify-start gap-3.5 px-4 py-3.5 text-left no-underline';
            return (
              <li key={workspace.id}>
                {href ? (
                  <Link
                    href={href}
                    className={className}
                    onClick={() =>
                      patch((d) => ({
                        lastWorkspace: { ...d.lastWorkspace, [signedIn.id]: workspace.id },
                      }))
                    }
                  >
                    {body}
                  </Link>
                ) : (
                  <div className={className} aria-disabled="true">
                    {body}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        {waiting.length > 0 && (
          <section className="sp-auth__card gap-3! p-4!" aria-labelledby="ws-inv">
            <h2 id="ws-inv" className="m-0 text-[15px] leading-[22px] font-semibold">
              Lời mời chờ bạn
            </h2>
            {waiting.map((invitation) => {
              const workspace = workspaces.find((w) => w.id === invitation.workspaceId)!;
              const date = localDate(invitation.expiresAt);
              return (
                <div key={invitation.id} className="flex flex-wrap items-center gap-3.5">
                  <span
                    className={`sp-switcher__mark sp-tenant-${workspace.tone}`}
                    aria-hidden="true"
                    style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
                  >
                    {workspace.monogram}
                  </span>
                  <div className="min-w-0">
                    <div className="text-[15px] leading-[22px] font-semibold">{workspace.name}</div>
                    <div className="text-[13px] leading-[18px] text-(--ink-muted)">
                      Mời làm {ROLE_LABEL[invitation.role]} · hết hạn {date.slice(8, 10)}/
                      {date.slice(5, 7)}
                    </div>
                  </div>
                  <div className="ms-auto flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        decline(invitation.token);
                        toast({ text: `Đã từ chối lời mời vào ${workspace.name}.` });
                      }}
                    >
                      Từ chối
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => take(invitation.token, workspace.name)}
                    >
                      Nhận
                    </Button>
                  </div>
                </div>
              );
            })}
          </section>
        )}
        <p className="m-0 text-center text-sm text-(--ink-muted)">
          <Link href="/mock/signup">Đăng ký cơ sở của riêng bạn</Link> ·{' '}
          <Link href="/mock/login" onClick={() => patch(() => ({ session: null }))}>
            Đăng xuất
          </Link>
        </p>
      </AuthPage>
      <AccountTools />
    </>
  );
}
