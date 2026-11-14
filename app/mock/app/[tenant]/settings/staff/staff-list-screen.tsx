'use client';

import { ChevronRight, Plus } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useAccountStore, workspaceBySlug } from '@/components/mock/account-store';
import { useStaffStore } from '@/components/mock/staff-store';
import { useAppHref } from '@/components/mock/use-app-href';
import { useInvitations } from '@/components/mock/use-invitations';
import { Button } from '@/components/sapio/button';
import { ConfirmDialog } from '@/components/sapio/confirm-dialog';
import { DataTable, type Column } from '@/components/sapio/data-table';
import { FilterChip, SearchField } from '@/components/sapio/filters';
import { Field } from '@/components/sapio/form';
import { PageHeader } from '@/components/sapio/page-header';
import { Pagination, TableFoot } from '@/components/sapio/pagination';
import { useToast } from '@/components/sapio/toast';
import {
  branchLabel,
  inviteDaysLeft,
  inviteEmailError,
  inviteState,
  invitableRoles,
  memberEmails,
  memberForRole,
  memberRows,
  ROLE_LABEL,
  takesBookingsFor,
  type MemberRow,
} from '@/mock/account';
import { fold } from '@/mock/customers';
import { tenantFixtures } from '@/mock/fixtures';
import type { Invitation, InviteRole } from '@/mock/fixtures/accounts';
import { initialsOfName } from '@/mock/people-format';
import { staffRoleOf } from '@/mock/selection';
import { formatDateTime } from '@/mock/time';

const PAGE_SIZES = [20, 50, 100] as const;

const ROLE_HELP: Record<InviteRole, string> = {
  technician: 'Xem lịch của mình, xin nghỉ, xem hoa hồng của mình.',
  receptionist: 'Lịch cả tiệm, tạo lịch, check-in, thu tiền, tạo yêu cầu hoàn tiền.',
  manager: 'Như lễ tân, thêm xếp ca, duyệt nghỉ, duyệt hoàn tiền, giảm giá, báo cáo.',
};

/** Nhân sự (MH-47): who works here, the invitations waiting, and the box to invite (BR-78). */
export function StaffListScreen({ tenantSlug }: { tenantSlug: string }) {
  const fixture = tenantFixtures.find((f) => f.tenant.slug === tenantSlug) ?? tenantFixtures[0]!;
  const workspace = workspaceBySlug(tenantSlug)!;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const appHref = useAppHref(tenantSlug);
  const toast = useToast();
  const { staff } = useStaffStore();
  const { now, accounts, members, invitations } = useAccountStore();
  const { send, resend, revoke } = useInvitations();
  const [inviting, setInviting] = useState(false);
  const [revoking, setRevoking] = useState<Invitation | null>(null);

  const role = staffRoleOf(searchParams.get('role'));
  const me = memberForRole(members, workspace.id, role);
  const canInvite = invitableRoles(role).length > 0 && me !== undefined;

  const q = searchParams.get('q') ?? '';
  const onlineOnly = searchParams.get('online') === '1';
  const sizeParam = Number(searchParams.get('size'));
  const size = PAGE_SIZES.find((s) => s === sizeParam) ?? PAGE_SIZES[0];
  const pageParam = Number(searchParams.get('page'));

  const hrefWith = (patch: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(patch)) {
      if (value === null || value === '') params.delete(key);
      else params.set(key, value);
    }
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  };
  /** Changing what the list holds sends it back to the first page. */
  const update = (patch: Record<string, string | null>) =>
    router.replace(hrefWith({ ...patch, page: null }), { scroll: false });

  const people = useMemo(
    () => memberRows(accounts, members, workspace.id),
    [accounts, members, workspace.id],
  );
  const profileOf = (row: MemberRow) =>
    staff.find((s) => s.resourceId === row.member.staffResourceId);
  const nameOf = (row: MemberRow) => profileOf(row)?.profile.displayName ?? row.account.fullName;

  const rows = useMemo(
    () =>
      people.filter((row) => {
        const profile = staff.find((s) => s.resourceId === row.member.staffResourceId);
        return (
          (!onlineOnly || profile?.profile.bookableOnline) &&
          (!q.trim() ||
            fold(profile?.profile.displayName ?? row.account.fullName).includes(fold(q)) ||
            fold(row.account.fullName).includes(fold(q)))
        );
      }),
    [people, staff, q, onlineOnly],
  );
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const page = Math.min(Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1, pages);
  const start = (page - 1) * size;
  const shown = rows.slice(start, start + size);

  const waiting = invitations
    .filter(
      (i) =>
        i.workspaceId === workspace.id &&
        (inviteState(i, now) === 'pending' || inviteState(i, now) === 'expired'),
    )
    .sort((a, b) => b.sentAt.localeCompare(a.sentAt));

  const columns: Column<MemberRow>[] = [
    {
      key: 'name',
      width: '30%',
      label: 'Nhân viên',
      cell: (row) => {
        const profile = profileOf(row);
        return (
          <div className="sp-table__primary">
            <span className="sp-avatar sp-avatar--sm">{initialsOfName(nameOf(row))}</span>
            <span className="min-w-0">
              {profile && role === 'owner' ? (
                <Link href={appHref(`settings/staff/${profile.resourceId}`)}>{nameOf(row)}</Link>
              ) : (
                nameOf(row)
              )}
              <span className="sp-table__secondary">
                {profile?.profile.title ? `${profile.profile.title} · ` : ''}
                {row.account.email}
              </span>
            </span>
          </div>
        );
      },
    },
    { key: 'role', width: '16%', label: 'Vai trò', cell: (row) => ROLE_LABEL[row.member.role] },
    {
      key: 'branch',
      width: '16%',
      label: 'Chi nhánh',
      cell: (row) => branchLabel(row.member.branchId),
    },
    {
      key: 'column',
      width: '20%',
      label: 'Nhận khách trên lịch',
      cell: (row) => (row.takesBookings ? 'Có' : <span className="sp-muted">Không</span>),
    },
    {
      key: 'actions',
      width: '18%',
      label: 'Thao tác',
      labelHidden: true,
      cell: (row) => {
        const profile = profileOf(row);
        return profile ? (
          <span className="flex gap-1">
            {role === 'owner' && (
              <Link
                href={appHref(`settings/staff/${profile.resourceId}`)}
                className="sp-btn sp-btn--ghost sp-btn--sm no-underline"
                aria-label={`Sửa hồ sơ ${nameOf(row)}`}
              >
                Sửa
              </Link>
            )}
            <Link
              href={appHref('calendar', { staff: profile.resourceId })}
              className="sp-btn sp-btn--ghost sp-btn--sm no-underline"
              aria-label={`Xem lịch của ${nameOf(row)}`}
            >
              Xem lịch
            </Link>
          </span>
        ) : null;
      },
    },
  ];

  return (
    <>
      <PageHeader
        title="Nhân sự"
        sub={`Ai làm ở ${fixture.tenant.name}, vai trò và chi nhánh`}
        actions={
          canInvite ? (
            <Button variant="primary" onClick={() => setInviting(true)}>
              <Plus size={16} aria-hidden="true" />
              Mời nhân viên
            </Button>
          ) : null
        }
      />
      <div className="sp-toolbar">
        <SearchField
          label="Tìm nhân viên"
          placeholder="Tên nhân viên"
          value={q}
          onChange={(value) => update({ q: value.trim() ? value : null })}
        />
        <FilterChip
          pressed={onlineOnly}
          onToggle={() => update({ online: onlineOnly ? null : '1' })}
        >
          Nhận đặt online
        </FilterChip>
      </div>
      {rows.length === 0 ? (
        <div className="sp-empty flex flex-col items-start gap-(--space-3)">
          <p className="m-0">Không có nhân viên nào khớp. Thử bỏ bộ lọc hoặc đổi từ khóa.</p>
          <Button onClick={() => update({ q: null, online: null })}>Bỏ lọc</Button>
        </div>
      ) : (
        <DataTable
          label="Danh sách nhân viên"
          columns={columns}
          rows={shown}
          rowKey={(row) => row.account.id}
          cards={(row) => {
            const profile = profileOf(row);
            const body = (
              <>
                <span className="sp-avatar">{initialsOfName(nameOf(row))}</span>
                <span className="sp-cards__body">
                  <span className="sp-cards__title">{nameOf(row)}</span>
                  <span className="sp-cards__meta">
                    {ROLE_LABEL[row.member.role]} ·{' '}
                    {row.takesBookings ? 'Có cột trên lịch' : 'Không có cột trên lịch'}
                  </span>
                </span>
              </>
            );
            return profile && role === 'owner' ? (
              <Link
                href={appHref(`settings/staff/${profile.resourceId}`)}
                className="sp-cards__item"
              >
                {body}
                <ChevronRight size={16} aria-hidden="true" className="text-(--ink-muted)" />
              </Link>
            ) : (
              <div className="sp-cards__item">{body}</div>
            );
          }}
          foot={
            <TableFoot
              summary={`Hiển thị ${start + 1}–${start + shown.length} trong ${rows.length} nhân viên`}
              page={page}
              pages={pages}
              hrefFor={(p) => hrefWith({ page: p === 1 ? null : String(p) })}
              size={size}
              sizes={PAGE_SIZES}
              onSize={(value) => update({ size: value === PAGE_SIZES[0] ? null : String(value) })}
            />
          }
          phoneFoot={
            <Pagination
              page={page}
              pages={pages}
              hrefFor={(p) => hrefWith({ page: p === 1 ? null : String(p) })}
            />
          }
        />
      )}

      <section aria-labelledby="staff-invites" className="flex flex-col gap-(--space-3)">
        <h2 id="staff-invites" className="m-0 text-[15px] leading-[22px] font-semibold">
          Lời mời đang chờ
        </h2>
        {waiting.length === 0 ? (
          <p className="sp-panel__note m-0">Không có lời mời nào đang chờ.</p>
        ) : (
          <div className="sp-table-card">
            <div
              className="sp-table-wrap"
              tabIndex={0}
              role="region"
              aria-label="Lời mời đang chờ, cuộn được"
            >
              <table className="sp-table table-fixed" style={{ minWidth: 860 }}>
                <thead>
                  <tr>
                    <th scope="col">Email</th>
                    <th scope="col">Vai trò</th>
                    <th scope="col">Chi nhánh</th>
                    <th scope="col">Gửi lúc</th>
                    <th scope="col">Trạng thái</th>
                    <th scope="col">
                      <span className="sr-only">Thao tác</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {waiting.map((invitation) => {
                    const expired = inviteState(invitation, now) === 'expired';
                    return (
                      <tr key={invitation.id}>
                        <td>{invitation.email}</td>
                        <td>{ROLE_LABEL[invitation.role]}</td>
                        <td>{branchLabel(invitation.branchId)}</td>
                        <td className="sp-num">
                          {formatDateTime(invitation.sentAt)} · {invitation.invitedBy.split(',')[0]}
                        </td>
                        <td>
                          {expired ? (
                            <span className="sp-badge sp-badge--no-show">Hết hạn</span>
                          ) : (
                            `Chờ nhận, còn ${inviteDaysLeft(invitation, now)} ngày`
                          )}
                        </td>
                        <td>
                          {me && invitableRoles(me.role).includes(invitation.role) && (
                            <span className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  const sent = resend(me, invitation.id);
                                  if (sent) {
                                    toast({
                                      text: expired
                                        ? `Đã mời lại ${sent.email}.`
                                        : `Đã gửi lại lời mời cho ${sent.email}; link cũ hết hiệu lực.`,
                                    });
                                  }
                                }}
                              >
                                {expired ? 'Mời lại' : 'Gửi lại'}
                              </Button>
                              {!expired && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setRevoking(invitation)}
                                >
                                  Thu hồi
                                </Button>
                              )}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
        <p className="sp-panel__note m-0">
          Quản lý chỉ mời được Lễ tân và Kỹ thuật viên; mời Quản lý thì cần chủ cơ sở. Link lời mời
          dùng một lần, hết hạn sau 7 ngày. Thư mời hiện ở{' '}
          <Link href="/mock/mailbox">hộp thư mẫu</Link>.
        </p>
      </section>

      {inviting && me && (
        <InviteDialog
          roles={invitableRoles(role)}
          branches={fixture.branches.map((b) => ({ id: b.id, name: b.name }))}
          memberEmails={memberEmails(accounts, members, workspace.id)}
          onClose={() => setInviting(false)}
          onSend={(input) => {
            const result = send(me, input);
            if (result.ok) {
              toast({ text: `Đã gửi lời mời tới ${result.invitation.email}.` });
              setInviting(false);
            }
            return result;
          }}
        />
      )}
      {revoking && me && (
        <ConfirmDialog
          open
          tone="danger"
          title={`Thu hồi lời mời của ${revoking.email}?`}
          body="Link trong email sẽ báo đã thu hồi. Muốn mời lại thì gửi lời mời mới."
          confirmLabel="Thu hồi"
          backLabel="Quay lại"
          onClose={() => setRevoking(null)}
          onConfirm={() => {
            revoke(me, revoking.id);
            toast({ text: `Đã thu hồi lời mời của ${revoking.email}.` });
            setRevoking(null);
          }}
        />
      )}
    </>
  );
}

/** The box that sends one invitation: email, role, whether the person has a calendar column, branch. */
function InviteDialog({
  roles,
  branches,
  memberEmails: existing,
  onClose,
  onSend,
}: {
  roles: InviteRole[];
  branches: { id: string; name: string }[];
  memberEmails: string[];
  onClose: () => void;
  onSend: (input: {
    email: string;
    role: InviteRole;
    branchId: string | null;
    takesBookings: boolean;
  }) => { ok: true } | { ok: false; field: 'email' | 'role'; error: string };
}) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<InviteRole>(
    roles.includes('technician') ? 'technician' : roles[0]!,
  );
  const [chosen, setChosen] = useState(false);
  const [branchId, setBranchId] = useState<string>(branches[0]?.id ?? '');
  const [touched, setTouched] = useState(false);
  const [rejected, setRejected] = useState<string | null>(null);

  const error = inviteEmailError(email, existing);
  const takes = takesBookingsFor(role, chosen);
  const technician = role === 'technician';
  // Only Technician, Receptionist, Manager are offered, in the order the plan lists them.
  const order: InviteRole[] = ['technician', 'receptionist', 'manager'];

  function submit() {
    setTouched(true);
    if (error) {
      document.getElementById('iv-email')?.focus();
      return;
    }
    const result = onSend({
      email,
      role,
      branchId: branchId === '' ? null : branchId,
      takesBookings: takes,
    });
    if (!result.ok && result.field === 'email') {
      setRejected(result.error);
      document.getElementById('iv-email')?.focus();
    }
  }

  return (
    <ConfirmDialog
      open
      title="Mời nhân viên"
      confirmLabel="Gửi lời mời"
      backLabel="Hủy"
      onClose={onClose}
      onConfirm={submit}
    >
      <Field
        id="iv-email"
        label="Email"
        help="Người được mời nhận link qua email này; link dùng một lần, hết hạn sau 7 ngày."
        error={touched ? (error ?? rejected) : null}
      >
        <input
          id="iv-email"
          type="email"
          autoComplete="off"
          value={email}
          aria-invalid={touched && (error ?? rejected) ? true : undefined}
          aria-describedby="iv-email-help"
          onChange={(e) => {
            setEmail(e.target.value);
            setRejected(null);
          }}
        />
      </Field>
      <fieldset className="m-0 flex flex-col gap-(--space-2) border-0 p-0">
        <legend className="sp-field__label mb-1 p-0">Vai trò</legend>
        {order
          .filter((r) => roles.includes(r))
          .map((r) => (
            <label key={r} className="sp-check">
              <input
                type="radio"
                name="iv-role"
                value={r}
                checked={role === r}
                onChange={() => setRole(r)}
              />
              <span>
                {ROLE_LABEL[r]}
                <span className="sp-check__hint">{ROLE_HELP[r]}</span>
              </span>
            </label>
          ))}
      </fieldset>
      <label className="sp-check">
        <input
          type="checkbox"
          checked={takes}
          disabled={technician}
          onChange={(e) => setChosen(e.target.checked)}
        />
        <span>
          Nhận khách trên lịch
          <span className="sp-check__hint">
            Có cột riêng trên lịch. Kỹ thuật viên luôn có; quản lý, lễ tân chọn được.
          </span>
        </span>
      </label>
      <Field id="iv-branch" label="Chi nhánh">
        <select id="iv-branch" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
          <option value="">Tất cả chi nhánh</option>
        </select>
      </Field>
      <p className="sp-panel__note m-0">
        Nhận xong, người mới có trong danh sách với hồ sơ trống; điền kỹ năng, cấp và ca ở trang hồ
        sơ trước khi nhận khách.
      </p>
    </ConfirmDialog>
  );
}
