/*
 * Sign-in, password reset, invitations and where an account goes after signing in (BR-76 to
 * BR-79). Pure: the time is always an argument, never read from a clock, and nothing imports
 * React, so Node can run it (scripts/check-account.ts).
 */
import type { Account, Invitation, InviteRole, Member, Workspace } from './fixtures/accounts.ts';
import type { Resource, Staff, StaffRoleId } from './fixtures/types.ts';
import { addMinutes, localDate } from './time.ts';

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

export const ROLE_LABEL: Record<StaffRoleId, string> = {
  owner: 'Chủ cơ sở',
  manager: 'Quản lý',
  receptionist: 'Lễ tân',
  technician: 'Kỹ thuật viên',
};

const DAY_MINUTES = 1440;
const MINUTE_MS = 60_000;

// ---------------------------------------------------------------------------------------------
// Sign-in (BR-76)

export const MAX_FAILED = 5;
/** The wrong attempt from which the page says how many are left. */
export const WARN_FROM = 3;
export const LOCK_MINUTES = 15;

/** What one email has done wrong lately; an email without an account is counted the same. */
export interface LoginRecord {
  failed: number;
  /** ISO 8601, UTC. */
  lockedUntil: string | null;
}

/** By normalized email. */
export type LoginRecords = Record<string, LoginRecord>;

export type LoginOutcome =
  | { kind: 'ok'; account: Account }
  /** `remaining` is how many tries are left before the lock, once there are few enough to say. */
  | { kind: 'wrong'; remaining: number | null }
  /** `notify`: the owner of the account gets an email about the lock; a made-up address gets none. */
  | { kind: 'locked'; until: string; notify: boolean };

/** Until when the email is locked, or `null` when it is not (the lock lapses by itself). */
export function lockedUntil(records: LoginRecords, email: string, now: string): string | null {
  const until = records[normalizeEmail(email)]?.lockedUntil ?? null;
  return until !== null && Date.parse(now) < Date.parse(until) ? until : null;
}

/** A try to sign in. Wrong email and wrong password look the same, and both count. */
export function attemptLogin(
  accounts: readonly Account[],
  records: LoginRecords,
  email: string,
  password: string,
  now: string,
): { outcome: LoginOutcome; records: LoginRecords } {
  const key = normalizeEmail(email);
  const until = lockedUntil(records, key, now);
  if (until !== null) return { outcome: { kind: 'locked', until, notify: false }, records };

  // A lock that has run out starts the count again.
  const lapsed = records[key]?.lockedUntil != null;
  const failedBefore = lapsed ? 0 : (records[key]?.failed ?? 0);
  const account = accounts.find((a) => a.email === key);
  const { [key]: _gone, ...rest } = records;

  if (account && account.password === password)
    return { outcome: { kind: 'ok', account }, records: rest };

  const failed = failedBefore + 1;
  if (failed >= MAX_FAILED) {
    const lock = addMinutes(now, LOCK_MINUTES);
    return {
      outcome: { kind: 'locked', until: lock, notify: Boolean(account) },
      records: { ...rest, [key]: { failed, lockedUntil: lock } },
    };
  }
  return {
    outcome: { kind: 'wrong', remaining: failed >= WARN_FROM ? MAX_FAILED - failed : null },
    records: { ...rest, [key]: { failed, lockedUntil: null } },
  };
}

// ---------------------------------------------------------------------------------------------
// Password reset (BR-77)

export const RESET_MINUTES = 30;
export const RESEND_SECONDS = 60;

export interface ResetToken {
  token: string;
  accountId: string;
  /** ISO 8601, UTC. */
  createdAt: string;
  /** ISO 8601, UTC. */
  expiresAt: string;
  usedAt: string | null;
  /** Order of issue; a newer token of the same account replaces the older ones. */
  seq: number;
}

export type ResetState = 'ok' | 'expired' | 'used' | 'replaced' | 'unknown';

/** Seconds before the same email can ask again; `0` when it can. */
export function resendWait(lastSent: Record<string, string>, email: string, now: string): number {
  const sent = lastSent[normalizeEmail(email)];
  if (!sent) return 0;
  const left = RESEND_SECONDS - (Date.parse(now) - Date.parse(sent)) / 1000;
  return Math.max(0, Math.ceil(left));
}

/**
 * Asks for a link. The page says the same thing whatever the email is, so an unknown email gets
 * no token but starts the same wait. Asking again within a minute changes nothing.
 */
export function requestReset(
  accounts: readonly Account[],
  tokens: readonly ResetToken[],
  lastSent: Record<string, string>,
  email: string,
  now: string,
  token: string,
): {
  tokens: ResetToken[];
  lastSent: Record<string, string>;
  issued: ResetToken | null;
  waitSeconds: number;
} {
  const key = normalizeEmail(email);
  const wait = resendWait(lastSent, key, now);
  if (wait > 0) return { tokens: [...tokens], lastSent, issued: null, waitSeconds: wait };

  const account = accounts.find((a) => a.email === key);
  const next = { ...lastSent, [key]: now };
  if (!account)
    return { tokens: [...tokens], lastSent: next, issued: null, waitSeconds: RESEND_SECONDS };

  const issued: ResetToken = {
    token,
    accountId: account.id,
    createdAt: now,
    expiresAt: addMinutes(now, RESET_MINUTES),
    usedAt: null,
    seq: tokens.reduce((m, t) => Math.max(m, t.seq), 0) + 1,
  };
  return {
    tokens: [...tokens, issued],
    lastSent: next,
    issued,
    waitSeconds: RESEND_SECONDS,
  };
}

export function resetState(tokens: readonly ResetToken[], token: string, now: string): ResetState {
  const found = tokens.find((t) => t.token === token);
  if (!found) return 'unknown';
  if (found.usedAt !== null) return 'used';
  if (tokens.some((t) => t.accountId === found.accountId && t.seq > found.seq)) return 'replaced';
  if (Date.parse(now) >= Date.parse(found.expiresAt)) return 'expired';
  return 'ok';
}

export type ResetResult =
  | { ok: false; state: Exclude<ResetState, 'ok'> }
  | {
      ok: true;
      account: Account;
      accounts: Account[];
      tokens: ResetToken[];
      records: LoginRecords;
    };

/**
 * Sets the new password, spends the link and lifts the lock. The sessions of other devices end
 * with it; the mock has one session, so the page only says so. The password was checked by BR-73
 * before this call.
 */
export function resetPassword(
  accounts: readonly Account[],
  tokens: readonly ResetToken[],
  records: LoginRecords,
  token: string,
  password: string,
  now: string,
): ResetResult {
  const state = resetState(tokens, token, now);
  if (state !== 'ok') return { ok: false, state };
  const found = tokens.find((t) => t.token === token)!;
  const account = accounts.find((a) => a.id === found.accountId)!;
  const changed = { ...account, password };
  const { [account.email]: _unlocked, ...rest } = records;
  return {
    ok: true,
    account: changed,
    accounts: accounts.map((a) => (a.id === account.id ? changed : a)),
    tokens: tokens.map((t) => (t.token === token ? { ...t, usedAt: now } : t)),
    records: rest,
  };
}

// ---------------------------------------------------------------------------------------------
// Invitations (BR-78)

export const INVITE_DAYS = 7;

/** `pending` is the only state a link works in; `expired` comes from the clock, not from a job. */
export type InviteState = Invitation['status'] | 'expired';

export const inviteExpiry = (sentAt: string) => addMinutes(sentAt, INVITE_DAYS * DAY_MINUTES);

export function inviteState(invitation: Invitation, now: string): InviteState {
  if (invitation.status !== 'pending') return invitation.status;
  return Date.parse(now) >= Date.parse(invitation.expiresAt) ? 'expired' : 'pending';
}

/** Whole days left, counting a started day: 6 days 23 hours left is "7". */
export function inviteDaysLeft(invitation: Invitation, now: string): number {
  const ms = Date.parse(invitation.expiresAt) - Date.parse(now);
  return Math.max(0, Math.ceil(ms / (DAY_MINUTES * MINUTE_MS)));
}

/** The owner invites every role below; a manager only the two roles under them. */
export function invitableRoles(inviter: StaffRoleId): InviteRole[] {
  if (inviter === 'owner') return ['manager', 'receptionist', 'technician'];
  if (inviter === 'manager') return ['receptionist', 'technician'];
  return [];
}

/** A technician always has a calendar column; the others choose. */
export const takesBookingsFor = (role: InviteRole, chosen: boolean) =>
  role === 'technician' ? true : chosen;

export const isInviteEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

/** The addresses that already belong to a tenant: its members. */
export function memberEmails(
  accounts: readonly Account[],
  members: readonly Member[],
  workspaceId: string,
): string[] {
  const ids = new Set(members.filter((m) => m.workspaceId === workspaceId).map((m) => m.accountId));
  return accounts.filter((a) => ids.has(a.id)).map((a) => a.email);
}

/** Error text for the email field of the invitation box, or `null`. */
export function inviteEmailError(email: string, existingMembers: readonly string[]): string | null {
  if (!email.trim()) return 'Nhập email người được mời.';
  if (!isInviteEmail(email)) return 'Email chưa đúng. Ví dụ: an@email.vn.';
  if (existingMembers.includes(normalizeEmail(email))) {
    return 'Email này đã là nhân viên của cơ sở.';
  }
  return null;
}

export interface InviteInput {
  workspaceId: string;
  email: string;
  role: InviteRole;
  /** `null`: every branch. */
  branchId: string | null;
  /** Ignored for a technician, who always takes bookings. */
  takesBookings: boolean;
  inviter: { accountId: string; label: string; role: StaffRoleId };
}

export type SendResult =
  | { ok: true; invitations: Invitation[]; invitation: Invitation }
  | { ok: false; field: 'email' | 'role'; error: string };

/** A new invitation, valid for seven days from `now`. */
export function sendInvitation(
  invitations: readonly Invitation[],
  existingMembers: readonly string[],
  input: InviteInput,
  now: string,
  token: string,
): SendResult {
  const error = inviteEmailError(input.email, existingMembers);
  if (error) return { ok: false, field: 'email', error };
  if (!invitableRoles(input.inviter.role).includes(input.role)) {
    return { ok: false, field: 'role', error: 'Vai trò này bạn chưa mời được.' };
  }
  const invitation: Invitation = {
    id: `inv-${invitations.length + 1}`,
    workspaceId: input.workspaceId,
    email: normalizeEmail(input.email),
    role: input.role,
    branchId: input.branchId,
    takesBookings: takesBookingsFor(input.role, input.takesBookings),
    token,
    oldTokens: [],
    invitedBy: input.inviter.label,
    invitedByAccountId: input.inviter.accountId,
    sentAt: now,
    expiresAt: inviteExpiry(now),
    status: 'pending',
  };
  return { ok: true, invitations: [...invitations, invitation], invitation };
}

/** Sending again, or inviting again after it ran out: a new link, and the old one stops working. */
export function resendInvitation(
  invitations: readonly Invitation[],
  id: string,
  now: string,
  token: string,
): { invitations: Invitation[]; invitation: Invitation | null } {
  let sent: Invitation | null = null;
  const next = invitations.map((inv) => {
    if (inv.id !== id || inv.status !== 'pending') return inv;
    sent = {
      ...inv,
      token,
      oldTokens: [...inv.oldTokens, inv.token],
      sentAt: now,
      expiresAt: inviteExpiry(now),
    };
    return sent;
  });
  return { invitations: next, invitation: sent };
}

/** The link of a revoked invitation says it was revoked. */
export function revokeInvitation(
  invitations: readonly Invitation[],
  id: string,
  now: string,
): { invitations: Invitation[]; invitation: Invitation | null } {
  let revoked: Invitation | null = null;
  const next = invitations.map((inv) => {
    if (inv.id !== id || inv.status !== 'pending') return inv;
    revoked = { ...inv, status: 'revoked' as const, decidedAt: now };
    return revoked;
  });
  return { invitations: next, invitation: revoked };
}

export type DeadReason = 'unknown' | 'replaced' | 'expired' | 'revoked' | 'accepted' | 'declined';

/** What the page of an invitation link shows. */
export type InviteView =
  | { kind: 'dead'; reason: DeadReason; invitation: Invitation | null }
  | { kind: 'new-account'; invitation: Invitation }
  | { kind: 'existing-account'; invitation: Invitation; account: Account }
  /** Signed in with another email: sign out first. */
  | { kind: 'other-account'; invitation: Invitation; sessionEmail: string };

export function inviteView(
  invitations: readonly Invitation[],
  accounts: readonly Account[],
  token: string,
  sessionEmail: string | null,
  now: string,
): InviteView {
  const invitation = invitations.find((inv) => inv.token === token);
  if (!invitation) {
    const old = invitations.find((inv) => inv.oldTokens.includes(token));
    return { kind: 'dead', reason: old ? 'replaced' : 'unknown', invitation: old ?? null };
  }
  const state = inviteState(invitation, now);
  if (state !== 'pending') return { kind: 'dead', reason: state, invitation };

  const account = accounts.find((a) => a.email === invitation.email);
  if (!account) return { kind: 'new-account', invitation };
  if (sessionEmail !== null && normalizeEmail(sessionEmail) !== invitation.email) {
    return { kind: 'other-account', invitation, sessionEmail: normalizeEmail(sessionEmail) };
  }
  return { kind: 'existing-account', invitation, account };
}

export interface AccountState {
  accounts: Account[];
  members: Member[];
  invitations: Invitation[];
}

export type AcceptResult =
  /** `member`: the account already has a role at this tenant; there is one per tenant (BR-78). */
  | { ok: false; reason: DeadReason | 'member' }
  | {
      ok: true;
      state: AccountState;
      account: Account;
      member: Member;
      createdAccount: boolean;
      invitation: Invitation;
    };

/**
 * Takes an invitation: the member is made, with a calendar column when the role takes bookings
 * (BR-78). A new email gets an account, the password already checked by BR-73 and the email taken
 * as verified; an existing one signed in as that email before calling.
 */
export function acceptInvitation(
  state: AccountState,
  token: string,
  details: { fullName: string; password: string },
  now: string,
): AcceptResult {
  const invitation = state.invitations.find((inv) => inv.token === token);
  if (!invitation) return { ok: false, reason: 'unknown' };
  const current = inviteState(invitation, now);
  if (current !== 'pending') return { ok: false, reason: current };

  const existing = state.accounts.find((a) => a.email === invitation.email);
  if (
    existing &&
    state.members.some(
      (m) => m.workspaceId === invitation.workspaceId && m.accountId === existing.id,
    )
  ) {
    return { ok: false, reason: 'member' };
  }
  const account: Account = existing ?? {
    id: `acc-${state.accounts.length + 1}`,
    email: invitation.email,
    fullName: details.fullName.trim(),
    password: details.password,
  };
  const column = state.members.filter(
    (m) => m.workspaceId === invitation.workspaceId && m.staffResourceId !== undefined,
  ).length;
  const member: Member = {
    workspaceId: invitation.workspaceId,
    accountId: account.id,
    role: invitation.role,
    branchId: invitation.branchId,
    ...(invitation.takesBookings
      ? { staffResourceId: `${invitation.workspaceId}-staff-${column + 1}` }
      : {}),
  };
  const accepted: Invitation = { ...invitation, status: 'accepted', decidedAt: now };
  return {
    ok: true,
    account,
    member,
    createdAccount: !existing,
    invitation: accepted,
    state: {
      accounts: existing ? state.accounts : [...state.accounts, account],
      members: [...state.members, member],
      invitations: state.invitations.map((inv) => (inv.id === invitation.id ? accepted : inv)),
    },
  };
}

export function declineInvitation(
  invitations: readonly Invitation[],
  token: string,
  now: string,
): Invitation[] {
  return invitations.map((inv) =>
    inv.token === token && inviteState(inv, now) === 'pending'
      ? { ...inv, status: 'declined' as const, decidedAt: now }
      : inv,
  );
}

/** Invitations of this email that can still be taken, soonest to run out first. */
export function pendingInvitationsFor(
  invitations: readonly Invitation[],
  email: string,
  now: string,
): Invitation[] {
  const key = normalizeEmail(email);
  return invitations
    .filter((inv) => inv.email === key && inviteState(inv, now) === 'pending')
    .sort((a, b) => a.expiresAt.localeCompare(b.expiresAt));
}

/** The column and the profile of a member who takes bookings: empty, so no skill yet (BR-03). */
export function blankStaffMember(input: {
  resourceId: string;
  tenantId: string;
  branchId: string;
  staffTypeId: string;
  account: Account;
  role: StaffRoleId;
  now: string;
}): { resource: Resource; staff: Staff } {
  const displayName = input.account.fullName.trim().split(/\s+/).at(-1) ?? input.account.fullName;
  return {
    resource: {
      id: input.resourceId,
      tenantId: input.tenantId,
      branchId: input.branchId,
      resourceTypeId: input.staffTypeId,
      name: displayName,
    },
    staff: {
      resourceId: input.resourceId,
      profile: {
        displayName,
        title: '',
        specialty: '',
        bookableOnline: false,
        fullName: input.account.fullName,
        employeeCode: '',
        phone: '',
        email: input.account.email,
        joinedAt: localDate(input.now).slice(0, 7),
      },
      role: input.role,
      level: 1,
      skillServiceIds: [],
    },
  };
}

// ---------------------------------------------------------------------------------------------
// Members of a tenant

export interface MemberRow {
  account: Account;
  member: Member;
  /** Has a column on the calendar. */
  takesBookings: boolean;
}

/** Everybody who works at the tenant, owner first, then by role. */
export function memberRows(
  accounts: readonly Account[],
  members: readonly Member[],
  workspaceId: string,
): MemberRow[] {
  const order: StaffRoleId[] = ['owner', 'manager', 'receptionist', 'technician'];
  return members
    .filter((m) => m.workspaceId === workspaceId)
    .flatMap((member) => {
      const account = accounts.find((a) => a.id === member.accountId);
      return account
        ? [{ account, member, takesBookings: member.staffResourceId !== undefined }]
        : [];
    })
    .sort((a, b) => order.indexOf(a.member.role) - order.indexOf(b.member.role));
}

/**
 * The person a role of the mock stands for: the owner and the receptionist by role, the manager by
 * role too. A technician is picked by `resourceId`; with none given, the first one.
 */
export function memberForRole(
  members: readonly Member[],
  workspaceId: string,
  role: StaffRoleId,
  resourceId?: string | null,
): Member | undefined {
  const of = members.filter((m) => m.workspaceId === workspaceId && m.role === role);
  return (resourceId ? of.find((m) => m.staffResourceId === resourceId) : undefined) ?? of[0];
}

/** BR-44: whoever has a column on the calendar has a commission of their own to look at. */
export const hasOwnCommission = (member: Member | undefined) =>
  member?.staffResourceId !== undefined;

// ---------------------------------------------------------------------------------------------
// After signing in (BR-79)

/** What a member meets at the door of a tenant. */
export type DoorEntry = 'open' | 'plan' | 'locked' | 'paused';

/** The plan ran out: the owner reaches only the plan page, staff cannot enter. A lock stops all. */
export function doorEntry(role: StaffRoleId, status: Workspace['status']): DoorEntry {
  if (status === 'locked') return 'locked';
  if (status === 'expired') return role === 'owner' ? 'plan' : 'paused';
  return 'open';
}

export interface Door {
  workspaceId: string;
  role: StaffRoleId;
  status: Workspace['status'];
}

export type Destination =
  { kind: 'enter'; workspaceId: string; entry: DoorEntry } | { kind: 'choose' };

/**
 * One tenant that can be entered goes straight in; more than one, or one that staff cannot enter,
 * goes to the choice page. After a password reset the most recent tenant opens by itself.
 */
export function afterLogin(
  doors: readonly Door[],
  lastWorkspaceId: string | null,
  options: { resumeLast?: boolean } = {},
): Destination {
  const entry = (door: Door): Destination => ({
    kind: 'enter',
    workspaceId: door.workspaceId,
    entry: doorEntry(door.role, door.status),
  });
  const enterable = (door: Door) => doorEntry(door.role, door.status) !== 'paused';

  const [only] = doors;
  if (doors.length === 1 && only) return enterable(only) ? entry(only) : { kind: 'choose' };
  if (options.resumeLast) {
    const last = doors.find((d) => d.workspaceId === lastWorkspaceId);
    if (last && enterable(last)) return entry(last);
  }
  return { kind: 'choose' };
}

/** The tenants of an account as doors; `overrides` replaces the stored status of a tenant. */
export function doorsOf(
  accountId: string,
  members: readonly Member[],
  workspaces: readonly Workspace[],
  overrides: Record<string, Workspace['status']> = {},
): Door[] {
  return members
    .filter((m) => m.accountId === accountId)
    .flatMap((member) => {
      const workspace = workspaces.find((w) => w.id === member.workspaceId);
      return workspace
        ? [
            {
              workspaceId: workspace.id,
              role: member.role,
              status: overrides[workspace.id] ?? workspace.status,
            },
          ]
        : [];
    });
}

/** The first page of each role in a tenant. */
const HOME: Record<StaffRoleId, string> = {
  owner: 'calendar',
  manager: 'calendar',
  receptionist: 'calendar',
  technician: 'my/schedule',
};

/**
 * Where a member lands in a tenant: the plan page, the lock page, or the first page of the role.
 * `null` when there is nothing to open (paused for staff, or a tenant without screens).
 */
export function entryHref(workspace: Workspace, member: Member, entry: DoorEntry): string | null {
  if (!workspace.built || entry === 'paused') return null;
  const base = `/mock/app/${workspace.slug}`;
  if (entry === 'plan') return `${base}/settings/plan`;
  const params = new URLSearchParams();
  if (member.role !== 'owner') params.set('role', member.role);
  if (member.role === 'technician' && member.staffResourceId) {
    params.set('me', member.staffResourceId);
  }
  const query = params.toString();
  const path = entry === 'locked' ? base : `${base}/${HOME[member.role]}`;
  return query ? `${path}?${query}` : path;
}
