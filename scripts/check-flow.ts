/*
 * Checks what keeps the mock going across a reload (mock/persist.ts) and the sample accounts of the
 * sign-in page (mock/account.ts, mock/fixtures/accounts.ts).
 * Run: pnpm check:flow   (Node 24 runs TypeScript directly)
 */
import { isDeepStrictEqual } from 'node:util';
import { sampleAccountLine } from '../mock/account.ts';
import {
  accounts,
  members,
  PLATFORM_ADMIN_EMAIL,
  SAMPLE_PASSWORD,
  workspaces,
} from '../mock/fixtures/accounts.ts';
import { salonTocMay } from '../mock/fixtures/salon-toc-may.ts';
import { spaThuCungPawpaw } from '../mock/fixtures/spa-thu-cung-pawpaw.ts';
import { deserialize, readSlice, serialize, writeSlice } from '../mock/persist.ts';

let failures = 0;
const report = (ok: boolean, name: string, detail = '') => {
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` :: ${detail}` : ''}`);
};

const roundTrips = (value: unknown) => isDeepStrictEqual(deserialize(serialize(value)), value);

// ---- serialize / deserialize ----
report(roundTrips({ vnd: 150_000n }), 'bigint trong một đối tượng giữ nguyên kiểu và giá trị');
report(
  roundTrips({ vnd: 2n ** 70n }),
  'bigint lớn hơn 2^63 không mất chữ số (tiền là số nguyên, không qua số thực)',
);
report(roundTrips([-5n, 0n, 7n]), 'mảng bigint, kể cả số âm của bút toán đảo');
report(roundTrips({ at: new Date('2026-11-15T03:05:00Z') }), 'Date giữ đúng thời điểm');
report(
  roundTrips({ a: [{ b: [1n, { c: new Date(0), d: [{ e: 2n }] }] }] }),
  'mảng và đối tượng lồng nhau nhiều tầng',
);
report(roundTrips({ s: new Set(['a', 'b']), m: new Map([['k', 3n]]) }), 'Set và Map');
report(
  roundTrips({ text: 'ca phe sua da', n: null, flag: false, list: [] }),
  'chuỗi, null, false, mảng rỗng đi qua nguyên vẹn',
);
report(
  !('gone' in (deserialize(serialize({ gone: undefined, kept: 1 })) as object)),
  'trường undefined bị bỏ, như JSON',
);
for (const f of [salonTocMay, spaThuCungPawpaw]) {
  report(roundTrips(f.money), `${f.tenant.slug}: state tiền của cơ sở (bigint) khứ hồi đúng`);
  report(roundTrips(f.appointments), `${f.tenant.slug}: lịch hẹn mẫu khứ hồi đúng`);
  report(roundTrips(f.services), `${f.tenant.slug}: dịch vụ mẫu khứ hồi đúng`);
}

// ---- storage never throws ----
// Node has no `window`: a read finds nothing and a write does nothing, both without an exception.
let threw = false;
try {
  writeSlice('x', { n: 1n });
  report(readSlice('x') === undefined, 'không có sessionStorage thì đọc trả về undefined');
} catch {
  threw = true;
}
report(!threw, 'đọc và ghi không ném lỗi khi trình duyệt không cho dùng storage');
let badJson = false;
try {
  deserialize('{không phải JSON');
} catch {
  badJson = true;
}
report(badJson, 'deserialize báo lỗi với văn bản hỏng; chỗ gọi bọc try/catch và dùng dữ liệu gốc');

// ---- sample accounts ----
const line = (id: string) => {
  const account = accounts.find((a) => a.id === id)!;
  return sampleAccountLine(account, members, workspaces);
};
report(
  line('acc-chinh') === 'Chính Nguyễn · chủ Salon Tóc Mây',
  'chủ một cơ sở',
  line('acc-chinh'),
);
report(
  line('acc-linh') === 'Phạm Khánh Linh · lễ tân 3 cơ sở',
  'một vai ở nhiều cơ sở gộp thành "lễ tân 3 cơ sở"',
  line('acc-linh'),
);
report(
  line('acc-quantri') === 'Quản trị Sapio · quản trị nền tảng',
  'tài khoản quản trị ghi "quản trị nền tảng"',
  line('acc-quantri'),
);
const admin = accounts.find((a) => a.platformAdmin);
report(
  admin?.email === PLATFORM_ADMIN_EMAIL && !members.some((m) => m.accountId === admin.id),
  'tài khoản quản trị có đúng một cái, không thuộc cơ sở nào',
);
report(
  accounts.every((a) => a.password === SAMPLE_PASSWORD),
  'mọi tài khoản mẫu dùng chung mật khẩu mẫu hiện ở trang đăng nhập',
);
report(
  new Set(accounts.map((a) => a.email)).size === accounts.length,
  'BR-76: email của các tài khoản mẫu không trùng nhau',
);

console.log(failures === 0 ? '\nTất cả đạt.' : `\n${failures} lỗi.`);
process.exit(failures === 0 ? 0 : 1);
