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
  ROLE_LABEL,
  type AcceptResult,
} from '@/mock/account';
import { addAudit } from '@/mock/audit';
import { workspaces } from '@/mock/fixtures/accounts';
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
        href: entryHref(workspace, member, doorEntry(member.role, workspace.status)),
      };
    },
    [accounts, members, invitations, now, patch, root],
  );

  const decline = useCallback(
    (token: string) => patch(() => ({ invitations: declineInvitation(invitations, token, now) })),
    [invitations, now, patch],
  );

  return { accept, decline };
}
