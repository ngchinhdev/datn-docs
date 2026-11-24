# Kế hoạch: xác thực nhân sự

Đặc tả chính thức:

- Nghiệp vụ và tiêu chí chấp nhận: `content/docs/features/auth.md` (BR-73.x, BR-76.x, BR-77.x, AC-01 đến AC-23)
- API: `content/docs/api/index.md`, `content/docs/api/auth.md`
- Màn hình: `content/docs/screens/login.md`
- Bảng: `content/docs/architecture/erd.md` mục 2
- Quyết định: T-07, T-08, T-16, T-18, T-19, T-20

Kế hoạch này chỉ chia việc. Trang nào ở trên nói khác kế hoạch thì làm theo trang đó, và báo lại.

## Chia PR

| Bước | Nhánh (`datn-saas`) | Nội dung | AC |
|---|---|---|---|
| A1 | `feat/auth-api` | Bảng, phiên, đăng nhập, đăng xuất, phiên hiện tại, chọn cơ sở, quản trị nền tảng, email báo khóa, Scalar, dữ liệu mẫu | 01–14, 21–23 |
| A2 | `feat/auth-web` | Rewrite `/api`, `proxy.ts`, trang đăng nhập (MH-03, MH-63), Chọn cơ sở (MH-06) | e2e của 01, 04, 06, 22, 23 |
| A3 | `feat/password-reset` | API #6 đến #8, MH-04 | 15–20 |
| A4 | `datn-docs` | fumadocs-openapi đọc `openapi.json` | |

Đợt sau: đăng ký cơ sở và xác thực email (MH-02), lời mời (MH-05), OTP khách (MH-16).

## A1. API xác thực

### A1a. Bảng và migration

- Thêm các bảng `users`, `sessions`, `login_throttles`, `tenants` (chỉ `id`, `slug`, `name`, `locked_at?`, `lock_reason?`, `created_at`), `memberships` (chưa có `branch_id`, `staff_resource_id`), theo ERD mục 2. Ghép thêm `password_resets` nếu dễ, vì A3 sẽ dùng.
- Email và slug kiểu `text`, không dùng `citext`; code chuẩn hóa trước khi lưu và so (`normalizeEmail`). ID là UUIDv7.
- Bật `casing: 'snake_case'` cho Drizzle (cả `drizzle({ client, casing })` và `drizzle.config.ts`): tên trong TS là camelCase, cột trong DB là snake_case.
- `memberships` bật RLS theo T-07, có hàm `memberships_of(user_id)` kiểu `SECURITY DEFINER`, chỉ trả `slug`, `name`, `role`, `locked_at`.
- Viết migration mới, không sửa `20261103150501_init`.

### A1b. Domain (hàm thuần, không import Nest hay Drizzle)

- `normalizeEmail`.
- `checkPassword` theo BR-73. Trả về mã lỗi: `PASSWORD_TOO_SHORT`, `PASSWORD_TOO_LONG` hoặc `PASSWORD_TOO_COMMON`.
- `nextThrottle(state, outcome, now)` theo BR-76.2 đến 76.7. Test thuộc tính bằng fast-check, kiểm hai điều:
  - không bao giờ khóa trước lần sai thứ 5;
  - trong lúc khóa thì trạng thái không đổi.
- `sessionExpiry(door, remember, createdAt, lastUsedAt)` theo BR-76.9 đến 76.11.
- `redirectAfterLogin(workspaces, lastTenantId, { afterReset })` theo bảng "Vào cơ sở" của trang tính năng.
- Thời gian luôn lấy từ `Clock`, không dùng `Date.now()`.

### A1c. Hạ tầng

- Hash mật khẩu bằng `@node-rs/argon2`, dùng tham số mặc định của OWASP cho argon2id.
- Tạo hash giả một lần lúc khởi động, để so khi email không có tài khoản.
- Danh sách mật khẩu phổ biến: file `100k-most-used-passwords-NCSC.txt` của SecLists (MIT), lưu trong `apps/api/assets/`. Nạp vào `Set` chữ thường lúc khởi động.
- Token phiên: 32 byte từ `crypto.randomBytes`, mã base64url. DB lưu SHA-256 hex.
- Cookie theo `api/index.md`. Thêm env `COOKIE_SECURE` (mặc định `true`) để Safari và Firefox dev chạy được trên `http://localhost`. Ghi rõ điều này trong `.env.example`.
- Email:
  - Gửi bằng Nodemailer tới Mailpit qua hàng đợi BullMQ `mail`.
  - Interface `MailQueue`, để test unit dùng bản giả.
  - Integration test đọc thư qua API của Mailpit (Testcontainers).
  - Nội dung email báo khóa lấy từ `lockMail` trong `datn-docs/mock/account-mail.ts`.
- Giới hạn theo IP bằng `@nestjs/throttler`, dùng các số trong `api/auth.md`.
- **Gói mới cần cài:** `@node-rs/argon2`, `@nestjs/throttler`, `@nestjs/bullmq`, `bullmq`, `nodemailer`, `uuid` (nếu Drizzle chưa có UUIDv7), `@scalar/nestjs-api-reference`. Ghim phiên bản chính xác.

### A1d. Endpoint

- `api/auth.md` #1 đến #5 và #9 đến #11. Mỗi endpoint làm đúng thứ tự xử lý ghi trong trang API.
- Guard `StaffSessionGuard` và `PlatformSessionGuard` đọc cookie, gắn `user` vào ngữ cảnh request, gia hạn phiên theo quy tắc 5 phút.
- `code` lỗi viết `UPPER_SNAKE_CASE` như `VALIDATION_FAILED` đang có.
- Khi tạo phiên, đặt `Set-Cookie` có `Path=/`. Request đi qua rewrite của Next (T-20), nên cookie thuộc về tên miền của web.
- Schema request và response đặt ở `packages/shared/src/auth.ts`, để A2 dùng lại.

### A1e. Tài liệu API

- Thay Swagger UI bằng Scalar ở `/docs` (T-19). `@nestjs/swagger` vẫn sinh tài liệu.
- Thêm script `pnpm --filter @datn/api openapi:export`, ghi ra `apps/api/openapi.json` mà không cần kết nối DB.

### A1f. Dữ liệu mẫu

`pnpm --filter @datn/api db:seed`:

- Lấy tài khoản từ `datn-docs/mock/fixtures/accounts.ts`, **bỏ Pawpaw**.
- Tenant: `toc-may` (Salon Tóc Mây) và `nail-ha-vy`.
- Tài khoản:
  - `chinh@tocmay.vn`: chủ `toc-may`;
  - `mai@`, `lan@`, `hung@tocmay.vn`: theo vai trò trong mock;
  - `linh.pham@email.vn`: lễ tân ở cả hai cơ sở;
  - `nam.tran@email.vn`: kỹ thuật viên `nail-ha-vy`;
  - `quantri@sapio.vn`: quản trị nền tảng.
- Mật khẩu `123456` (BR-73.5).
- Script chỉ chạy khi `NODE_ENV !== 'production'`.

### A1g. Test

- Mỗi dòng AC-01 đến AC-14 và AC-21 đến AC-23 có ít nhất một test.
  - Tên test bắt đầu bằng mã BR (`it('BR-76.4: ...')`) và ghi mã AC trong tên hoặc trong comment.
  - Đồng hồ dùng `Clock` giả.
- Unit test cho domain.
- Integration test bằng Supertest và Testcontainers (Postgres, Redis, Mailpit). Không mock DB.
- Thêm một test hai request sai **cùng lúc** cho một email: bộ đếm phải tăng đúng 2.

### Xong khi

- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm test:integration` đều qua.
- [ ] `http://localhost:4000/docs` mở Scalar, thấy đủ 8 endpoint của A1.
- [ ] Dùng Scalar đăng nhập `chinh@tocmay.vn` / `123456`, nhận `redirectTo = /app/toc-may/calendar`.
- [ ] Sai 5 lần với `mai@tocmay.vn`: lần 5 trả 423, Mailpit (`:8025`) có thư "Đăng nhập Sapio bị tạm khóa".
- [ ] `quantri@sapio.vn` đăng nhập ở `/v1/auth/login` thì trả 401. Ở `/v1/platform/auth/login` thì trả 200.
- [ ] `apps/api/openapi.json` đã được tạo.
- [ ] PR có mục "Tự quyết" ghi mọi chỗ làm khác tài liệu.

## Prompt A1

```
Làm trong datn-saas: git checkout main && git pull && git checkout -b feat/auth-api.
Đọc CLAUDE.md, mục mới nhất trong datn-docs/sessions/progress/, rồi đọc kỹ:
datn-docs/content/docs/features/auth.md, api/index.md, api/auth.md, architecture/erd.md mục 2,
decisions/t07, t08, t18, t19, t20. Làm bước A1 trong datn-docs/sessions/plans/auth.md, mục A1a
đến A1g, mỗi mục một hoặc vài commit nhỏ.
Tài liệu trong content/docs là đặc tả: làm đúng thứ tự xử lý, mã lỗi, số giây và số lần trong đó.
Chỗ nào tài liệu thiếu hoặc mâu thuẫn với code thì dừng lại hỏi mình, đừng tự đoán.
Domain là hàm thuần, thời gian lấy từ Clock. Mỗi dòng AC trong phạm vi A1 có test, tên test bắt đầu
bằng mã BR. Không mock DB trong integration test. Chỉ cài các gói ghi trong A1c, ghim phiên bản
chính xác. Không sửa migration đã có.
Mở PR mới, ghi mục "Tự quyết", không merge.
```
