/*
 * Accounts, who works where, and the invitations in flight (BR-76 to BR-79). One account has one
 * role in each tenant it belongs to; a member who takes bookings has a calendar column, whose
 * resource id is `staffResourceId`.
 */
import type { StaffRoleId } from './types.ts';

/** Every sample account signs in with this sentence (23 characters, BR-73). */
export const SAMPLE_PASSWORD = 'ca phe sua da buoi sang';

export interface Account {
  id: string;
  /** Lower case; the address is unique (BR-76). */
  email: string;
  fullName: string;
  password: string;
}

/** A tenant as the account pages list it. Tenants without a fixture have no screens behind them. */
export interface Workspace {
  id: string;
  slug: string;
  name: string;
  monogram: string;
  /** Which accent of the Sapio design system the mark wears. */
  tone: 'may' | 'pawpaw';
  /** `false`: only data of the account, there is no app behind it. */
  built: boolean;
  /** Where the plan stands; a locked tenant is the platform's doing (BR-75). */
  status: 'active' | 'expired' | 'locked';
}

export interface Member {
  workspaceId: string;
  accountId: string;
  role: StaffRoleId;
  /** `null`: every branch. */
  branchId: string | null;
  /** A member with a calendar column; the resource is a person of the tenant. */
  staffResourceId?: string;
}

export type InviteRole = Exclude<StaffRoleId, 'owner'>;

export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'revoked';

export interface Invitation {
  id: string;
  workspaceId: string;
  /** Lower case; the link belongs to this address (BR-78). */
  email: string;
  role: InviteRole;
  /** `null`: every branch. */
  branchId: string | null;
  takesBookings: boolean;
  /** The part of the link that names the invitation; sending again makes a new one. */
  token: string;
  /** Links this invitation had before it was sent again; they no longer work. */
  oldTokens: string[];
  /** Name and role of who invited, e.g. `Chính Nguyễn, chủ cơ sở`. */
  invitedBy: string;
  invitedByAccountId: string;
  /** ISO 8601, UTC. */
  sentAt: string;
  /** ISO 8601, UTC: seven days after `sentAt`; there is no job that flips it (BR-78). */
  expiresAt: string;
  status: InvitationStatus;
  /** ISO 8601, UTC. */
  decidedAt?: string;
}

export const workspaces: Workspace[] = [
  {
    id: 'may',
    slug: 'toc-may',
    name: 'Salon Tóc Mây',
    monogram: 'M',
    tone: 'may',
    built: true,
    status: 'active',
  },
  {
    id: 'pawpaw',
    slug: 'pawpaw',
    name: 'Spa thú cưng Pawpaw',
    monogram: 'P',
    tone: 'pawpaw',
    built: true,
    status: 'active',
  },
  {
    id: 'havy',
    slug: 'nail-ha-vy',
    name: 'Nail Hạ Vy',
    monogram: 'H',
    tone: 'may',
    built: false,
    status: 'expired',
  },
  {
    id: 'bong',
    slug: 'tiem-goi-bong',
    name: 'Tiệm gội Bống',
    monogram: 'B',
    tone: 'pawpaw',
    built: false,
    status: 'active',
  },
];

export const accounts: Account[] = [
  {
    id: 'acc-chinh',
    email: 'chinh@tocmay.vn',
    fullName: 'Chính Nguyễn',
    password: SAMPLE_PASSWORD,
  },
  { id: 'acc-mai', email: 'mai@tocmay.vn', fullName: 'Trần Thị Mai', password: SAMPLE_PASSWORD },
  { id: 'acc-lan', email: 'lan@tocmay.vn', fullName: 'Phạm Ngọc Lan', password: SAMPLE_PASSWORD },
  { id: 'acc-hung', email: 'hung@tocmay.vn', fullName: 'Lê Văn Hùng', password: SAMPLE_PASSWORD },
  {
    id: 'acc-linh',
    email: 'linh.pham@email.vn',
    fullName: 'Phạm Khánh Linh',
    password: SAMPLE_PASSWORD,
  },
  { id: 'acc-ha', email: 'ha.le@pawpaw.vn', fullName: 'Lê Thu Hà', password: SAMPLE_PASSWORD },
  {
    id: 'acc-khoa',
    email: 'khoa@pawpaw.vn',
    fullName: 'Nguyễn Đăng Khoa',
    password: SAMPLE_PASSWORD,
  },
  { id: 'acc-vy', email: 'vy@pawpaw.vn', fullName: 'Trịnh Hải Vy', password: SAMPLE_PASSWORD },
  {
    id: 'acc-nam',
    email: 'nam.tran@email.vn',
    fullName: 'Trần Quốc Nam',
    password: SAMPLE_PASSWORD,
  },
];

export const members: Member[] = [
  { workspaceId: 'may', accountId: 'acc-chinh', role: 'owner', branchId: null },
  {
    workspaceId: 'may',
    accountId: 'acc-mai',
    role: 'technician',
    branchId: 'may-q3',
    staffResourceId: 'may-mai',
  },
  {
    workspaceId: 'may',
    accountId: 'acc-lan',
    role: 'technician',
    branchId: 'may-q3',
    staffResourceId: 'may-lan',
  },
  {
    workspaceId: 'may',
    accountId: 'acc-hung',
    role: 'manager',
    branchId: 'may-q3',
    staffResourceId: 'may-hung',
  },
  { workspaceId: 'may', accountId: 'acc-linh', role: 'receptionist', branchId: 'may-q3' },
  { workspaceId: 'pawpaw', accountId: 'acc-ha', role: 'owner', branchId: null },
  {
    workspaceId: 'pawpaw',
    accountId: 'acc-khoa',
    role: 'manager',
    branchId: 'pawpaw-td',
    staffResourceId: 'paw-khoa',
  },
  {
    workspaceId: 'pawpaw',
    accountId: 'acc-vy',
    role: 'technician',
    branchId: 'pawpaw-td',
    staffResourceId: 'paw-vy',
  },
  { workspaceId: 'pawpaw', accountId: 'acc-linh', role: 'receptionist', branchId: 'pawpaw-td' },
  { workspaceId: 'havy', accountId: 'acc-linh', role: 'receptionist', branchId: null },
  { workspaceId: 'havy', accountId: 'acc-nam', role: 'technician', branchId: null },
];

const OWNER = { invitedBy: 'Chính Nguyễn, chủ cơ sở', invitedByAccountId: 'acc-chinh' };

/** Sent 07/11 10:05 (Vietnam), so they run out at 10:05 on 14/11 (BR-78). */
const SENT = '2026-11-07T03:05:00Z';
const EXPIRES = '2026-11-14T03:05:00Z';

export const invitations: Invitation[] = [
  {
    id: 'inv-thao',
    workspaceId: 'may',
    email: 'thao.nguyen@email.vn',
    role: 'technician',
    branchId: 'may-q3',
    takesBookings: true,
    token: 'moi-thao',
    oldTokens: [],
    ...OWNER,
    sentAt: SENT,
    expiresAt: EXPIRES,
    status: 'pending',
  },
  {
    id: 'inv-khoa',
    workspaceId: 'may',
    email: 'khoa.do@email.vn',
    role: 'receptionist',
    branchId: 'may-q3',
    takesBookings: false,
    token: 'moi-khoa',
    oldTokens: [],
    invitedBy: 'Hùng, quản lý',
    invitedByAccountId: 'acc-hung',
    sentAt: '2026-10-29T09:20:00Z',
    expiresAt: '2026-11-05T09:20:00Z',
    status: 'pending',
  },
  {
    id: 'inv-nam',
    workspaceId: 'pawpaw',
    email: 'nam.tran@email.vn',
    role: 'receptionist',
    branchId: 'pawpaw-td',
    takesBookings: false,
    token: 'moi-nam',
    oldTokens: [],
    invitedBy: 'Lê Thu Hà, chủ cơ sở',
    invitedByAccountId: 'acc-ha',
    sentAt: SENT,
    expiresAt: EXPIRES,
    status: 'pending',
  },
  {
    id: 'inv-ngoc',
    workspaceId: 'may',
    email: 'ngoc.le@email.vn',
    role: 'receptionist',
    branchId: 'may-q3',
    takesBookings: false,
    token: 'moi-ngoc',
    oldTokens: [],
    ...OWNER,
    sentAt: '2026-11-05T03:00:00Z',
    expiresAt: '2026-11-12T03:00:00Z',
    status: 'revoked',
    decidedAt: '2026-11-06T04:00:00Z',
  },
  {
    id: 'inv-linh-paw',
    workspaceId: 'pawpaw',
    email: 'linh.pham@email.vn',
    role: 'receptionist',
    branchId: 'pawpaw-td',
    takesBookings: false,
    token: 'moi-linh-pawpaw',
    oldTokens: [],
    invitedBy: 'Lê Thu Hà, chủ cơ sở',
    invitedByAccountId: 'acc-ha',
    sentAt: '2026-10-20T03:00:00Z',
    expiresAt: '2026-10-27T03:00:00Z',
    status: 'accepted',
    decidedAt: '2026-10-21T03:00:00Z',
  },
  {
    id: 'inv-linh-bong',
    workspaceId: 'bong',
    email: 'linh.pham@email.vn',
    role: 'receptionist',
    branchId: null,
    takesBookings: false,
    token: 'moi-linh-bong',
    oldTokens: [],
    invitedBy: 'Bống Trần, chủ cơ sở',
    invitedByAccountId: 'acc-bong',
    sentAt: '2026-11-05T03:00:00Z',
    expiresAt: '2026-11-12T03:00:00Z',
    status: 'pending',
  },
];
