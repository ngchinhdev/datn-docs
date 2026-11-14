/*
 * The emails of the account pages: the link to reset a password, the notice of a lock, the
 * invitation. The mock has no mail server, so they land in a sample mailbox. Pure.
 */
import type { Account, Invitation } from './fixtures/accounts.ts';
import { formatTime, localDate } from './time.ts';

export interface AccountMail {
  id: string;
  /** ISO 8601, UTC. */
  at: string;
  to: string;
  subject: string;
  /** Line before the details. */
  lead: string;
  rows: [string, string][];
  action?: { label: string; href: string };
  notes: string[];
}

/** `10:35, 07/11/2026`. */
export const formatMoment = (iso: string) => {
  const date = localDate(iso);
  return `${formatTime(iso)}, ${date.slice(8, 10)}/${date.slice(5, 7)}/${date.slice(0, 4)}`;
};

/** `14:52`: minutes and seconds left of a lock or a wait. */
export const formatWait = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

const firstName = (name: string) => name.trim().split(/\s+/).at(-1) ?? name;

export function resetMail(
  account: Account,
  token: string,
  expiresAt: string,
  now: string,
  seq: number,
): AccountMail {
  return {
    id: `mail-reset-${seq}`,
    at: now,
    to: account.email,
    subject: 'Đặt lại mật khẩu Sapio',
    lead: `Chào ${firstName(account.fullName)}, bạn vừa xin đặt lại mật khẩu cho tài khoản ${account.email}.`,
    rows: [
      ['Dùng được tới', formatMoment(expiresAt)],
      ['Số lần dùng', 'Một lần'],
    ],
    action: { label: 'Đặt mật khẩu mới', href: `/mock/reset-password?token=${token}` },
    notes: ['Không phải bạn xin? Bỏ qua email này, mật khẩu giữ nguyên.'],
  };
}

export function lockMail(account: Account, until: string, now: string, seq: number): AccountMail {
  return {
    id: `mail-lock-${seq}`,
    at: now,
    to: account.email,
    subject: 'Đăng nhập Sapio bị tạm khóa',
    lead: `Chào ${firstName(account.fullName)}, tài khoản ${account.email} vừa bị nhập sai mật khẩu 5 lần liên tiếp.`,
    rows: [
      ['Tạm khóa tới', formatMoment(until)],
      ['Lý do', 'Sai mật khẩu 5 lần'],
    ],
    action: {
      label: 'Đặt lại mật khẩu',
      href: `/mock/forgot-password?email=${encodeURIComponent(account.email)}`,
    },
    notes: ['Không phải bạn? Đặt lại mật khẩu để mở khóa ngay và chặn người lạ.'],
  };
}

/** The invitation as the person invited receives it (BR-78). */
export function inviteMail(input: {
  invitation: Invitation;
  workspaceName: string;
  roleLabel: string;
  branchLabel: string;
  now: string;
  seq: number;
}): AccountMail {
  const { invitation } = input;
  return {
    id: `mail-invite-${input.seq}`,
    at: input.now,
    to: invitation.email,
    subject: `${invitation.invitedBy.split(',')[0]} mời bạn vào ${input.workspaceName} trên Sapio`,
    lead: `Bạn được mời làm ${input.roleLabel} ở ${input.workspaceName}.`,
    rows: [
      ['Vai trò', input.roleLabel],
      ['Chi nhánh', input.branchLabel],
      ['Người mời', invitation.invitedBy],
      ['Hết hạn', formatMoment(invitation.expiresAt)],
    ],
    action: { label: 'Nhận lời mời', href: `/mock/invite/${invitation.token}` },
    notes: ['Link dùng một lần. Không quen người mời thì bỏ qua email này.'],
  };
}
