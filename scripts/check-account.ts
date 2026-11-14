/*
 * Checks sign-in, password reset, invitations and the way into a tenant (mock/account.ts, BR-76
 * to BR-79) and the members of the sample data.
 * Run: pnpm check:account   (Node 24 runs TypeScript directly)
 */
import {
  acceptInvitation,
  afterLogin,
  attemptLogin,
  blankStaffMember,
  declineInvitation,
  doorEntry,
  hasOwnCommission,
  inviteDaysLeft,
  inviteEmailError,
  inviteState,
  inviteView,
  invitableRoles,
  lockedUntil,
  memberEmails,
  memberForRole,
  memberRows,
  pendingInvitationsFor,
  requestReset,
  resendInvitation,
  resendWait,
  resetPassword,
  resetState,
  revokeInvitation,
  sendInvitation,
  type AccountState,
  type Door,
  type LoginOutcome,
  type LoginRecords,
  type ResetToken,
} from '../mock/account.ts';
import {
  accounts,
  invitations,
  members,
  workspaces,
  SAMPLE_PASSWORD,
} from '../mock/fixtures/accounts.ts';
import { tenantFixtures } from '../mock/fixtures/index.ts';
import { addMinutes, localToUtc, MOCK_NOW } from '../mock/time.ts';

let failures = 0;
const report = (ok: boolean, name: string, detail = '') => {
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` :: ${detail}` : ''}`);
};
const show = (v: unknown) => JSON.stringify(v);

const LINH = 'linh.pham@email.vn';
const WRONG = 'sai mat khau roi';
const at = (minutes: number) => addMinutes(MOCK_NOW, minutes);

/** Wrong passwords in a row from `MOCK_NOW`; returns the last outcome and the records. */
function fail(email: string, times: number, start: LoginRecords = {}) {
  let records = start;
  let outcome: LoginOutcome = { kind: 'wrong', remaining: null };
  for (let i = 0; i < times; i++) {
    const result = attemptLogin(accounts, records, email, WRONG, MOCK_NOW);
    records = result.records;
    outcome = result.outcome;
  }
  return { outcome, records };
}

// ---- BR-76: sign-in ----

const sample = attemptLogin(accounts, {}, LINH, SAMPLE_PASSWORD, MOCK_NOW);
report(sample.outcome.kind === 'ok', 'BR-76: đúng email và mật khẩu thì vào được');
report(
  attemptLogin(accounts, {}, '  Linh.Pham@Email.vn ', SAMPLE_PASSWORD, MOCK_NOW).outcome.kind ===
    'ok',
  'BR-76: email không phân biệt hoa thường, bỏ khoảng trắng',
);

for (const [times, remaining] of [
  [1, null],
  [2, null],
  [3, 2],
  [4, 1],
] as const) {
  const { outcome } = fail(LINH, times);
  report(
    outcome.kind === 'wrong' && outcome.remaining === remaining,
    `BR-76: sai lần ${times} ${remaining === null ? 'chưa báo số lần còn lại' : `báo còn ${remaining} lần`}`,
    show(outcome),
  );
}

const fifth = fail(LINH, 5);
report(
  fifth.outcome.kind === 'locked' && fifth.outcome.until === at(15) && fifth.outcome.notify,
  'BR-76: sai lần 5 khóa 15 phút (tới 10:35) và gửi email báo chủ tài khoản',
  show(fifth.outcome),
);

const lockedRight = attemptLogin(accounts, fifth.records, LINH, SAMPLE_PASSWORD, at(14));
report(
  lockedRight.outcome.kind === 'locked' && lockedUntil(fifth.records, LINH, at(14)) === at(15),
  'BR-76: đang khóa thì mật khẩu đúng cũng không vào được',
  show(lockedRight.outcome),
);
const lapsed = attemptLogin(accounts, fifth.records, LINH, SAMPLE_PASSWORD, at(15));
report(
  lapsed.outcome.kind === 'ok' && lockedUntil(fifth.records, LINH, at(15)) === null,
  'BR-76: hết 15 phút thì đăng nhập lại được',
  show(lapsed.outcome),
);
const afterLapse = attemptLogin(accounts, fifth.records, LINH, WRONG, at(16));
report(
  afterLapse.outcome.kind === 'wrong' && afterLapse.outcome.remaining === null,
  'BR-76: hết khóa thì đếm lại từ đầu',
  show(afterLapse.outcome),
);

const twoThenRight = attemptLogin(accounts, fail(LINH, 2).records, LINH, SAMPLE_PASSWORD, MOCK_NOW);
const afterRight = attemptLogin(accounts, twoThenRight.records, LINH, WRONG, MOCK_NOW);
report(
  afterRight.outcome.kind === 'wrong' && afterRight.outcome.remaining === null,
  'BR-76: đăng nhập đúng thì xóa số lần sai',
  show(afterRight.outcome),
);

const ghost = 'khong.co@email.vn';
const ghostRuns = [1, 2, 3, 4, 5].map((n) => fail(ghost, n).outcome);
const realRuns = [1, 2, 3, 4, 5].map((n) => fail(LINH, n).outcome);
const strip = (o: (typeof ghostRuns)[number]) => (o.kind === 'locked' ? { kind: o.kind } : o);
report(
  show(ghostRuns.map(strip)) === show(realRuns.map(strip)),
  'BR-76: email không có tài khoản báo y hệt email có tài khoản, từng lần sai',
  show(ghostRuns.map(strip)),
);
const ghostLock = ghostRuns[4];
report(
  ghostLock?.kind === 'locked' && ghostLock.until === at(15) && !ghostLock.notify,
  'BR-76: email không có tài khoản cũng bị khóa 15 phút nhưng không gửi email',
  show(ghostLock),
);

// ---- BR-77: reset ----

const first = requestReset(accounts, [], {}, LINH, MOCK_NOW, 'dat-lai-1');
report(
  first.issued?.expiresAt === at(30) && first.waitSeconds === 60,
  'BR-77: link đặt lại có hạn 30 phút, gửi lại được sau 60 giây',
  show(first.issued),
);
const ghostAsk = requestReset(accounts, [], {}, ghost, MOCK_NOW, 'dat-lai-x');
report(
  ghostAsk.issued === null &&
    ghostAsk.waitSeconds === first.waitSeconds &&
    ghostAsk.tokens.length === 0,
  'BR-77: email không có tài khoản nhận cùng phản hồi, không tạo link',
  show(ghostAsk),
);
report(
  resendWait(first.lastSent, LINH, addMinutes(MOCK_NOW, 0.75)) === 15 &&
    resendWait(first.lastSent, LINH, at(1)) === 0,
  'BR-77: đợi 60 giây mới gửi lại (còn 15 giây ở giây thứ 45)',
);
const tooSoon = requestReset(accounts, first.tokens, first.lastSent, LINH, at(0.5), 'dat-lai-2');
report(
  tooSoon.issued === null && tooSoon.tokens.length === 1,
  'BR-77: hỏi lại trong 60 giây thì không có link mới',
);
const second = requestReset(accounts, first.tokens, first.lastSent, LINH, at(2), 'dat-lai-2');
report(
  resetState(second.tokens, 'dat-lai-1', at(3)) === 'replaced' &&
    resetState(second.tokens, 'dat-lai-2', at(3)) === 'ok',
  'BR-77: link mới làm link cũ hết hiệu lực',
);
report(
  resetState(first.tokens, 'dat-lai-1', at(29.99)) === 'ok' &&
    resetState(first.tokens, 'dat-lai-1', at(30)) === 'expired',
  'BR-77: link quá 30 phút thì hết hạn',
);
report(
  resetState(first.tokens, 'khong-co', MOCK_NOW) === 'unknown',
  'BR-77: link lạ báo không tìm thấy',
);

const locked = fail(LINH, 5).records;
const reset = resetPassword(
  accounts,
  first.tokens,
  locked,
  'dat-lai-1',
  'mot cau mat khau moi dai',
  at(5),
);
report(
  reset.ok &&
    lockedUntil(reset.records, LINH, at(5)) === null &&
    Object.keys(reset.records).length === 0,
  'BR-77: đặt lại mật khẩu thì mở khóa',
  show(reset.ok),
);
report(
  reset.ok &&
    attemptLogin(reset.accounts, reset.records, LINH, 'mot cau mat khau moi dai', at(5)).outcome
      .kind === 'ok' &&
    attemptLogin(reset.accounts, reset.records, LINH, SAMPLE_PASSWORD, at(5)).outcome.kind ===
      'wrong',
  'BR-77: mật khẩu mới dùng được, mật khẩu cũ thì không',
);
if (reset.ok) {
  const again = resetPassword(
    reset.accounts,
    reset.tokens,
    reset.records,
    'dat-lai-1',
    'mot cau mat khau khac nua',
    at(6),
  );
  report(!again.ok && again.state === 'used', 'BR-77: link chỉ dùng một lần', show(again));
}
const late = resetPassword(
  accounts,
  first.tokens,
  {},
  'dat-lai-1',
  'mot cau mat khau moi dai',
  at(31),
);
report(!late.ok && late.state === 'expired', 'BR-77: link hết hạn thì không đặt được mật khẩu');

// ---- BR-78: invitations ----

const sent = localToUtc('2026-11-07', '10:05');
const expiry = localToUtc('2026-11-14', '10:05');
const thao = invitations.find((i) => i.id === 'inv-thao')!;
report(
  Date.parse(thao.sentAt) === Date.parse(sent) && Date.parse(thao.expiresAt) === Date.parse(expiry),
  'BR-78: lời mời gửi 07/11 10:05 hết hạn 14/11 10:05',
  show([thao.sentAt, thao.expiresAt]),
);
report(
  inviteState(thao, addMinutes(expiry, -1)) === 'pending' &&
    inviteState(thao, expiry) === 'expired',
  'BR-78: hết hạn đúng 14/11 10:05, không cần job',
);
report(inviteDaysLeft(thao, MOCK_NOW) === 7, 'BR-78: ngày gửi còn 7 ngày');
report(
  invitableRoles('owner').join() === 'manager,receptionist,technician' &&
    invitableRoles('manager').join() === 'receptionist,technician' &&
    invitableRoles('receptionist').length === 0 &&
    invitableRoles('technician').length === 0,
  'BR-78: quản lý không mời được Quản lý; lễ tân, kỹ thuật viên không mời',
);

const mayMembers = memberEmails(accounts, members, 'may');
report(
  inviteEmailError('linh.pham@email.vn', mayMembers) !== null &&
    inviteEmailError(' Hung@TocMay.vn ', mayMembers) !== null &&
    inviteEmailError('thao.nguyen@email.vn', mayMembers) === null,
  'BR-78: không mời email đã là thành viên (không phân biệt hoa thường)',
);
report(
  inviteEmailError('', mayMembers) !== null &&
    inviteEmailError('khong-phai-email', mayMembers) !== null,
  'BR-78: email trống hoặc sai dạng bị chặn',
);

const managerSend = sendInvitation(
  invitations,
  mayMembers,
  {
    workspaceId: 'may',
    email: 'moi.quan.ly@email.vn',
    role: 'manager',
    branchId: 'may-q3',
    takesBookings: false,
    inviter: { accountId: 'acc-hung', label: 'Hùng, quản lý', role: 'manager' },
  },
  MOCK_NOW,
  'moi-x',
);
report(
  !managerSend.ok && managerSend.field === 'role',
  'BR-78: quản lý gửi lời mời Quản lý bị từ chối',
);
const techSend = sendInvitation(
  invitations,
  mayMembers,
  {
    workspaceId: 'may',
    email: 'Moi.KTV@email.vn',
    role: 'technician',
    branchId: 'may-q3',
    takesBookings: false,
    inviter: { accountId: 'acc-chinh', label: 'Chính Nguyễn, chủ cơ sở', role: 'owner' },
  },
  MOCK_NOW,
  'moi-ktv',
);
report(
  techSend.ok &&
    techSend.invitation.takesBookings &&
    techSend.invitation.email === 'moi.ktv@email.vn' &&
    techSend.invitation.expiresAt === addMinutes(MOCK_NOW, 7 * 1440),
  'BR-78: kỹ thuật viên luôn nhận khách trên lịch; hạn 7 ngày từ lúc gửi',
);
const frontDesk = sendInvitation(
  invitations,
  mayMembers,
  {
    workspaceId: 'may',
    email: 'le.tan.moi@email.vn',
    role: 'receptionist',
    branchId: null,
    takesBookings: false,
    inviter: { accountId: 'acc-chinh', label: 'Chính Nguyễn, chủ cơ sở', role: 'owner' },
  },
  MOCK_NOW,
  'moi-lt',
);
report(
  frontDesk.ok && !frontDesk.invitation.takesBookings,
  'BR-78: lễ tân chọn được, không chọn thì không có cột lịch',
);

const resent = resendInvitation(invitations, 'inv-thao', at(60), 'moi-thao-2');
const stateOf = (token: string, list = resent.invitations) =>
  inviteView(list, accounts, token, null, at(61));
report(
  stateOf('moi-thao').kind === 'dead' &&
    (stateOf('moi-thao') as { reason?: string }).reason === 'replaced' &&
    stateOf('moi-thao-2').kind === 'new-account',
  'BR-78: gửi lại tạo link mới, link cũ hết hiệu lực',
);
report(
  resent.invitation?.expiresAt === addMinutes(at(60), 7 * 1440),
  'BR-78: gửi lại tính hạn 7 ngày từ lúc gửi lại',
);
const expiredKhoa = invitations.find((i) => i.id === 'inv-khoa')!;
report(inviteState(expiredKhoa, MOCK_NOW) === 'expired', 'BR-78: lời mời 29/10 đã hết hạn');
const reinvited = resendInvitation(invitations, 'inv-khoa', MOCK_NOW, 'moi-khoa-2');
report(
  reinvited.invitation !== null && inviteState(reinvited.invitation, MOCK_NOW) === 'pending',
  'BR-78: mời lại lời mời hết hạn thì thành đang chờ',
);

const revoked = revokeInvitation(invitations, 'inv-thao', at(5));
const revokedView = inviteView(revoked.invitations, accounts, 'moi-thao', null, at(6));
report(
  revokedView.kind === 'dead' && revokedView.reason === 'revoked',
  'BR-78: thu hồi thì link báo đã thu hồi',
);
report(
  revokeInvitation(revoked.invitations, 'inv-thao', at(7)).invitation === null,
  'BR-78: lời mời đã thu hồi không thu hồi lần nữa',
);

const view = (token: string, session: string | null = null) =>
  inviteView(invitations, accounts, token, session, MOCK_NOW);
report(view('moi-thao').kind === 'new-account', 'BR-78: email chưa có tài khoản thì tạo tài khoản');
report(view('moi-nam').kind === 'existing-account', 'BR-78: email đã có tài khoản thì đăng nhập');
const other = view('moi-nam', LINH);
report(
  other.kind === 'other-account' && other.sessionEmail === LINH,
  'BR-78: đang đăng nhập email khác phải đăng xuất trước',
);
report(
  view('moi-nam', 'Nam.Tran@email.vn').kind === 'existing-account',
  'BR-78: đúng email đang đăng nhập thì nhận luôn',
);
report(
  [
    ['moi-khoa', 'expired'],
    ['moi-ngoc', 'revoked'],
    ['moi-linh-pawpaw', 'accepted'],
    ['khong-co', 'unknown'],
  ].every(([token, reason]) => {
    const v = view(token!);
    return v.kind === 'dead' && v.reason === reason;
  }),
  'BR-78: lời mời hết hạn, thu hồi, đã dùng, link lạ đều là trang trống',
);

const baseState: AccountState = {
  accounts: [...accounts],
  members: [...members],
  invitations: [...invitations],
};
const accepted = acceptInvitation(
  baseState,
  'moi-thao',
  { fullName: 'Nguyễn Phương Thảo', password: 'mot cau mat khau moi dai' },
  MOCK_NOW,
);
if (accepted.ok) {
  report(
    accepted.createdAccount &&
      accepted.account.email === 'thao.nguyen@email.vn' &&
      accepted.member.role === 'technician' &&
      accepted.member.staffResourceId === 'may-staff-4',
    'BR-78: nhận lời mời thì tạo tài khoản và thành viên có cột lịch',
    show(accepted.member),
  );
  const again = acceptInvitation(accepted.state, 'moi-thao', { fullName: '', password: '' }, at(1));
  report(!again.ok && again.reason === 'accepted', 'BR-78: link chỉ dùng một lần');
  const { staff, resource } = blankStaffMember({
    resourceId: accepted.member.staffResourceId!,
    tenantId: 'may',
    branchId: 'may-q3',
    staffTypeId: 'may-rt-stylist',
    account: accepted.account,
    role: accepted.member.role,
    now: MOCK_NOW,
  });
  report(
    staff.skillServiceIds.length === 0 &&
      staff.profile.displayName === 'Thảo' &&
      !staff.profile.bookableOnline &&
      resource.name === 'Thảo' &&
      staff.profile.joinedAt === '2026-11',
    'BR-78: người mới nhận khách có hồ sơ trống, chưa có kỹ năng (BR-03)',
    show(staff.profile),
  );
  report(
    memberRows(accepted.state.accounts, accepted.state.members, 'may').some(
      (r) => r.account.email === 'thao.nguyen@email.vn' && r.takesBookings,
    ),
    'BR-78: người mới có trong danh sách nhân viên',
  );
} else {
  report(false, 'BR-78: nhận lời mời của thao.nguyen', show(accepted));
}
const lateAccept = acceptInvitation(
  baseState,
  'moi-khoa',
  { fullName: 'A', password: 'x' },
  MOCK_NOW,
);
report(!lateAccept.ok && lateAccept.reason === 'expired', 'BR-78: lời mời hết hạn không nhận được');
const dup = acceptInvitation(
  {
    ...baseState,
    invitations: [{ ...thao, email: LINH, token: 'moi-trung' }, ...baseState.invitations],
  },
  'moi-trung',
  { fullName: '', password: '' },
  MOCK_NOW,
);
report(!dup.ok && dup.reason === 'member', 'BR-78: một tài khoản chỉ có một vai trò ở mỗi cơ sở');
const declined = declineInvitation(invitations, 'moi-linh-bong', MOCK_NOW);
const declinedView = inviteView(declined, accounts, 'moi-linh-bong', null, MOCK_NOW);
report(
  declinedView.kind === 'dead' && declinedView.reason === 'declined',
  'BR-78: từ chối thì link báo đã từ chối',
);
const waiting = pendingInvitationsFor(invitations, LINH, MOCK_NOW);
report(
  waiting.length === 1 && waiting[0]?.workspaceId === 'bong',
  'BR-79: trang chọn cơ sở chỉ liệt kê lời mời còn nhận được',
  show(waiting.map((w) => w.id)),
);

// ---- BR-79: where to go after signing in ----

const doorsOf = (email: string): Door[] => {
  const id = accounts.find((a) => a.email === email)!.id;
  return members
    .filter((m) => m.accountId === id)
    .map((m) => ({
      workspaceId: m.workspaceId,
      role: m.role,
      status: workspaces.find((w) => w.id === m.workspaceId)!.status,
    }));
};
const dest = (d: ReturnType<typeof afterLogin>) => show(d);
report(
  dest(afterLogin(doorsOf('mai@tocmay.vn'), null)) ===
    dest({ kind: 'enter', workspaceId: 'may', entry: 'open' }),
  'BR-79: thuộc một cơ sở thì vào thẳng',
);
report(
  dest(afterLogin(doorsOf(LINH), 'may')) === dest({ kind: 'choose' }),
  'BR-79: thuộc nhiều cơ sở thì qua trang chọn cơ sở',
);
report(
  dest(afterLogin(doorsOf(LINH), 'may', { resumeLast: true })) ===
    dest({ kind: 'enter', workspaceId: 'may', entry: 'open' }),
  'BR-79: sau đặt lại mật khẩu vào cơ sở dùng gần nhất',
);
report(
  dest(afterLogin(doorsOf(LINH), 'havy', { resumeLast: true })) === dest({ kind: 'choose' }),
  'BR-79: cơ sở dùng gần nhất đã tạm dừng thì qua trang chọn',
);
report(
  dest(afterLogin([{ workspaceId: 'havy', role: 'owner', status: 'expired' }], null)) ===
    dest({ kind: 'enter', workspaceId: 'havy', entry: 'plan' }),
  'BR-79: cơ sở hết gói, chủ cơ sở chỉ vào trang Gói Sapio',
);
report(
  dest(afterLogin(doorsOf('nam.tran@email.vn'), null)) === dest({ kind: 'choose' }),
  'BR-79: cơ sở hết gói, nhân viên không vào được: thấy "Tạm dừng" ở trang chọn',
);
report(
  doorEntry('owner', 'locked') === 'locked' &&
    doorEntry('technician', 'locked') === 'locked' &&
    dest(afterLogin([{ workspaceId: 'may', role: 'receptionist', status: 'locked' }], null)) ===
      dest({ kind: 'enter', workspaceId: 'may', entry: 'locked' }),
  'BR-79: cơ sở bị khóa thì ai vào cũng gặp trang khóa',
);

// ---- Dữ liệu mẫu ----

const linhId = accounts.find((a) => a.email === LINH)!.id;
report(
  members
    .filter((m) => m.accountId === linhId && m.role === 'receptionist')
    .map((m) => m.workspaceId)
    .sort()
    .join() === 'havy,may,pawpaw',
  'BR-78: Linh là Lễ tân ở Tóc Mây, Pawpaw và Nail Hạ Vy',
);
report(
  members.filter((m) => m.accountId === linhId && m.staffResourceId !== undefined).length === 0,
  'BR-78: Linh không nhận khách trên lịch',
);
report(
  tenantFixtures.every((f) => f.actors.receptionist === 'Linh'),
  'Người thu tiền của lễ tân ở cả hai cơ sở là Linh',
);
const onePerTenant = members.every(
  (m, i) =>
    members.findIndex((n) => n.workspaceId === m.workspaceId && n.accountId === m.accountId) === i,
);
report(onePerTenant, 'BR-78: mỗi tài khoản một vai trò ở mỗi cơ sở');
report(
  new Set(accounts.map((a) => a.email)).size === accounts.length &&
    accounts.every((a) => a.email === a.email.toLowerCase() && [...a.password].length >= 15),
  'BR-73, BR-76: email duy nhất, chữ thường; mật khẩu mẫu từ 15 ký tự',
);
for (const f of tenantFixtures) {
  const ws = workspaces.find((w) => w.slug === f.tenant.slug)!;
  const bookable = members.filter((m) => m.workspaceId === ws.id && m.staffResourceId);
  report(
    f.staff.every((s) =>
      bookable.some((m) => m.staffResourceId === s.resourceId && m.role === s.role),
    ) && bookable.length === f.staff.length,
    `BR-78: ${f.tenant.name}: mỗi nhân viên trên lịch là một thành viên cùng vai trò`,
  );
  report(
    members.filter((m) => m.workspaceId === ws.id && m.role === 'owner').length === 1,
    `${f.tenant.name}: có đúng một chủ cơ sở`,
  );
}
const salonMembers = memberRows(accounts, members, 'may');
report(
  salonMembers.map((r) => r.account.fullName).join('|') ===
    'Chính Nguyễn|Lê Văn Hùng|Phạm Khánh Linh|Trần Thị Mai|Phạm Ngọc Lan' &&
    salonMembers.find((r) => r.member.role === 'receptionist')?.takesBookings === false &&
    salonMembers.find((r) => r.member.role === 'manager')?.takesBookings === true,
  'BR-78: danh sách nhân viên gồm cả Linh (không có cột lịch) và Hùng (có cột lịch)',
  show(salonMembers.map((r) => r.account.fullName)),
);
const hung = memberForRole(members, 'may', 'manager');
report(
  hung?.staffResourceId === 'may-hung' &&
    memberForRole(members, 'pawpaw', 'manager')?.staffResourceId === 'paw-khoa' &&
    memberForRole(members, 'may', 'receptionist')?.accountId === linhId &&
    memberForRole(members, 'may', 'technician', 'may-lan')?.staffResourceId === 'may-lan' &&
    memberForRole(members, 'may', 'technician')?.staffResourceId === 'may-mai',
  'Bộ chọn vai trò: Lễ tân là Linh, Quản lý là Hùng (Pawpaw là Khoa), Kỹ thuật viên theo người chọn',
);
report(
  hasOwnCommission(hung) &&
    !hasOwnCommission(memberForRole(members, 'may', 'receptionist')) &&
    !hasOwnCommission(memberForRole(members, 'may', 'owner')),
  'BR-44: Hoa hồng của tôi chỉ có với người có cột lịch (Hùng có, Linh và chủ cơ sở không)',
);

console.log(failures === 0 ? '\nTất cả đạt.' : `\n${failures} lỗi.`);
process.exit(failures === 0 ? 0 : 1);
