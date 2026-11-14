'use client';

import { useCallback } from 'react';
import { useAccountStore } from '@/components/mock/account-store';
import { useScheduleRoot } from '@/components/mock/schedule-store';
import {
  acceptInvitation,
  blankStaffMember,
  branchLabel,
  declineInvitation,
  doorEntry,
  entryHref,
  lockedStatuses,
  memberEmails,
  resendInvitation,
  revokeInvitation,
  ROLE_LABEL,
  sendInvitation,
  type AcceptResult,
  type InviteInput,
} from '@/mock/account';
import { inviteMail } from '@/mock/account-mail';
import { addAudit } from '@/mock/audit';
import { workspaces, type Invitation, type Member } from '@/mock/fixtures/accounts';
import { tenantFixtures } from '@/mock/fixtures';

export type Accepted = Extract<AcceptResult, { ok: true }> & {
  /** Where the new member lands; `null` when the tenant has no screens in the mock. */
  href: string | null;
};

/** Taking or declining an invitation, from its own page or from the tenant choice page (BR-78). */
export function useInvitations() {
  const store = useAccountStore();
  const root = useScheduleRoot();
  const { now, accounts, members, invitations, patch } = store;

  const accept = useCallback(
    (token: string, details: { fullName: string; password: string }): AcceptResult | Accepted => {
      const result = acceptInvitation({ accounts, members, invitations }, token, details, now);
      if (!result.ok) return result;

      const { account, member, invitation } = result;
      const workspace = workspaces.find((w) => w.id === member.workspaceId)!;
      const fixture = tenantFixtures.find((f) => f.tenant.id === workspace.id);
      const staffType = fixture?.resourceTypes.find((t) => t.isStaff);
      const column =
        member.staffResourceId && fixture && staffType
          ? blankStaffMember({
              resourceId: member.staffResourceId,
              tenantId: fixture.tenant.id,
              branchId: member.branchId ?? fixture.branches[0]!.id,
              staffTypeId: staffType.id,
              account,
              role: member.role,
              now,
            })
          : null;

      patch((d) => ({
        ...result.state,
        session: { accountId: account.id, persistent: false },
        joiners: column
          ? { ...d.joiners, [workspace.slug]: [...(d.joiners[workspace.slug] ?? []), column.staff] }
          : d.joiners,
      }));
      if (fixture) {
        root.updateTenant(workspace.slug, (prev) => ({
          ...prev,
          resources: column ? [...prev.resources, column.resource] : prev.resources,
          money: {
            ...prev.money,
            audit: addAudit(
              prev.money.audit,
              now,
              { name: account.fullName, role: ROLE_LABEL[member.role] },
              {
                action: 'Nhận lời mời',
                object: invitation.email,
                detail: `${ROLE_LABEL[member.role]} · ${branchLabel(member.branchId)}${
                  column ? ' · có cột trên lịch' : ''
                }`,
                href: 'settings/staff',
              },
            ),
          },
        }));
      }
      return {
        ...result,
        href: entryHref(
          workspace,
          member,
          doorEntry(member.role, lockedStatuses(store.locks)[workspace.id] ?? workspace.status),
        ),
      };
    },
    [accounts, members, invitations, now, patch, root, store.locks],
  );

  const decline = useCallback(
    (token: string) => patch(() => ({ invitations: declineInvitation(invitations, token, now) })),
    [invitations, now, patch],
  );

  /** One line in the audit log of the tenant, by the person doing it (BR-63). */
  const log = useCallback(
    (
      workspaceId: string,
      by: Member | undefined,
      entry: { action: string; object: string; detail: string },
    ) => {
      const workspace = workspaces.find((w) => w.id === workspaceId);
      const account = accounts.find((a) => a.id === by?.accountId);
      if (!workspace || !by || !account) return;
      root.updateTenant(workspace.slug, (prev) => ({
        ...prev,
        money: {
          ...prev.money,
          audit: addAudit(
            prev.money.audit,
            now,
            { name: account.fullName, role: ROLE_LABEL[by.role] },
            { ...entry, href: 'settings/staff' },
          ),
        },
      }));
    },
    [accounts, now, root],
  );

  const mailOf = useCallback(
    (invitation: Invitation, seq: number) =>
      inviteMail({
        invitation,
        workspaceName: workspaces.find((w) => w.id === invitation.workspaceId)?.name ?? '',
        roleLabel: ROLE_LABEL[invitation.role],
        branchLabel: branchLabel(invitation.branchId),
        now,
        seq,
      }),
    [now],
  );

  const detailOf = (invitation: Invitation) =>
    `${ROLE_LABEL[invitation.role]} · ${branchLabel(invitation.branchId)}`;

  /** A new invitation from `by`; the email and role are checked first (BR-78). */
  const send = useCallback(
    (by: Member, input: Omit<InviteInput, 'workspaceId' | 'inviter'>) => {
      const account = accounts.find((a) => a.id === by.accountId)!;
      const result = sendInvitation(
        invitations,
        memberEmails(accounts, members, by.workspaceId),
        {
          ...input,
          workspaceId: by.workspaceId,
          inviter: {
            accountId: account.id,
            label: `${account.fullName}, ${ROLE_LABEL[by.role].toLowerCase()}`,
            role: by.role,
          },
        },
        now,
        `moi-${invitations.length + 1}`,
      );
      if (!result.ok) return result;
      patch((d) => ({
        invitations: result.invitations,
        mails: [...d.mails, mailOf(result.invitation, d.mails.length + 1)],
      }));
      log(by.workspaceId, by, {
        action: 'Gửi lời mời',
        object: result.invitation.email,
        detail: detailOf(result.invitation),
      });
      return result;
    },
    [accounts, members, invitations, now, patch, mailOf, log],
  );

  /** Sending again, or inviting again after it ran out: a new link, the old one stops working. */
  const resend = useCallback(
    (by: Member, id: string) => {
      const old = invitations.find((i) => i.id === id);
      if (!old) return null;
      const result = resendInvitation(
        invitations,
        id,
        by.role,
        now,
        `${id}-${old.oldTokens.length + 2}`,
      );
      const sent = result.invitation;
      if (!sent) return null;
      patch((d) => ({
        invitations: result.invitations,
        mails: [...d.mails, mailOf(sent, d.mails.length + 1)],
      }));
      log(by.workspaceId, by, {
        action: 'Gửi lại lời mời',
        object: sent.email,
        detail: detailOf(sent),
      });
      return sent;
    },
    [invitations, now, patch, mailOf, log],
  );

  const revoke = useCallback(
    (by: Member, id: string) => {
      const result = revokeInvitation(invitations, id, by.role, now);
      const revoked = result.invitation;
      if (!revoked) return null;
      patch(() => ({ invitations: result.invitations }));
      log(by.workspaceId, by, {
        action: 'Thu hồi lời mời',
        object: revoked.email,
        detail: detailOf(revoked),
      });
      return revoked;
    },
    [invitations, now, patch, log],
  );

  return { accept, decline, send, resend, revoke };
}
